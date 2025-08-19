import base64
import io
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..storage import get_minio, ensure_bucket, MINIO_BUCKET

# Providers:
# - OpenAI (images via gpt-image-1)
# - Google Generative AI (images via Imagen 3)

router = APIRouter(prefix="/generate", tags=["generate"])


@router.get("/health")
def generate_health():
    return {"ok": True}


@router.get("/debug")
def generate_debug():
    return {
        "env": {
            "GOOGLE_CLOUD_PROJECT": bool(os.getenv("GOOGLE_CLOUD_PROJECT")),
            "GOOGLE_CLOUD_LOCATION": bool(os.getenv("GOOGLE_CLOUD_LOCATION")),
            "GOOGLE_APPLICATION_CREDENTIALS": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
            "GOOGLE_API_KEY": bool(os.getenv("GOOGLE_API_KEY")),
            "OPENAI_API_KEY": bool(os.getenv("OPENAI_API_KEY")),
        }
    }


class GenerateImageBody(BaseModel):
    provider: str  # "openai" | "google"
    model: str
    prompt: str
    tags: Optional[List[str]] = None
    width: int = 1920
    height: int = 1080


class GenerateVideoBody(BaseModel):
    provider: str  # "openai" | "google"
    model: str
    prompt: str
    tags: Optional[List[str]] = None
    width: int = 1920
    height: int = 1080
    duration_seconds: int = 5
    # Provider-specific optional fields
    avatar_id: Optional[str] = None
    voice_id: Optional[str] = None


def _compose_prompt(prompt: str, tags: Optional[List[str]], width: int, height: int) -> str:
    exact_note_en = (
        f"Generate exactly {width}x{height} (16:9). Do not crop, pad, add borders, or black bars. "
        "Compose fully within the 16:9 frame."
    )
    exact_note_tr = (
        f"Tam olarak {width}x{height} (16:9) oluştur. Kırpma, doldurma, kenarlık veya siyah şerit ekleme. "
        "Kompozisyonu 16:9 çerçeve içinde yap."
    )
    tags_note = f"Styles/Tags: {', '.join(tags)}." if tags else ""
    return "\n\n".join([prompt.strip(), tags_note, exact_note_en, exact_note_tr]).strip()


def _upload_bytes(object_name: str, data: bytes, content_type: str) -> str:
    client = get_minio()
    ensure_bucket(client)
    # Use put_object for direct upload
    data_stream = io.BytesIO(data)
    data_stream.seek(0)
    client.put_object(
        MINIO_BUCKET,
        object_name,
        data_stream,
        length=len(data),
        content_type=content_type,
    )
    return object_name


@router.post("/image")
async def generate_image(body: GenerateImageBody):
    provider = body.provider.lower()
    model = body.model
    prompt = _compose_prompt(body.prompt, body.tags, body.width, body.height)
    # Log prompts
    try:
        import logging
        logging.info(
            f"[GENERATE][image] provider={provider} model={model} size={body.width}x{body.height} tags={body.tags} raw_prompt={body.prompt}"
        )
        logging.info(f"[GENERATE][image] composed_prompt={prompt}")
    except Exception:
        pass

    # Generate image bytes
    image_bytes: bytes | None = None
    content_type = "image/png"

    if provider == "openai":
        try:
            from openai import AsyncOpenAI

            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise HTTPException(status_code=400, detail="OPENAI_API_KEY is not set")

            client = AsyncOpenAI(api_key=api_key)
            # OpenAI Images API supports limited sizes for gpt-image-1
            # Per API: supported sizes are 1024x1024, 1024x1536, 1536x1024, and 'auto'
            allowed_sizes = {"1024x1024", "1536x1024", "1024x1536"}
            requested_size = f"{body.width}x{body.height}"
            if requested_size not in allowed_sizes:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "OpenAI gpt-image-1 supports sizes: 1024x1024, 1024x1536, 1536x1024 (or 'auto'). "
                        "Bu model ile tam 16:9 üretilmez. Lütfen Google sağlayıcısını seçin ya da geçerli bir boyut seçin."
                    ),
                )
            result = await client.images.generate(model=model, prompt=prompt, size=requested_size)
            if not result.data or not getattr(result.data[0], "b64_json", None):
                raise HTTPException(status_code=502, detail="OpenAI did not return image data")
            image_bytes = base64.b64decode(result.data[0].b64_json)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI image generation failed: {e}")

    elif provider == "luma":
        # Use Luma REST API for image generation
        try:
            import requests
            api_key = os.getenv("LUMAAI_API_KEY")
            if not api_key:
                raise HTTPException(status_code=400, detail="LUMAAI_API_KEY is not set")

            # Map requested size to closest supported aspect ratio
            w_req, h_req = body.width, body.height
            ratio = (w_req / h_req) if h_req else (16/9)
            if abs(ratio - 1.0) < 0.02:
                ar = "1:1"
            elif abs(ratio - (3/4)) < 0.02:
                ar = "3:4"
            elif abs(ratio - (4/3)) < 0.02:
                ar = "4:3"
            elif ratio < 1.0:
                # portrait type; prefer 9:16
                ar = "9:16"
            else:
                # default to landscape 16:9
                ar = "16:9"

            model_id = model or "photon-1"
            headers = {"authorization": f"Bearer {api_key}", "accept": "application/json", "content-type": "application/json"}
            payload = {
                "prompt": prompt,
                "aspect_ratio": ar,
                "model": model_id,
            }
            r_create = requests.post(
                "https://api.lumalabs.ai/dream-machine/v1/generations/image",
                json=payload,
                headers=headers,
                timeout=60,
            )
            if not r_create.ok:
                raise HTTPException(status_code=500, detail=f"Luma image create failed: {r_create.status_code} {r_create.text}")
            gen = r_create.json()
            gen_id = gen.get("id")
            if not gen_id:
                raise HTTPException(status_code=502, detail="Luma image response missing id")

            # Poll for completion
            image_url = None
            for _ in range(120):
                r_get = requests.get(
                    f"https://api.lumalabs.ai/dream-machine/v1/generations/{gen_id}",
                    headers=headers,
                    timeout=30,
                )
                if not r_get.ok:
                    import time as _t
                    _t.sleep(2)
                    continue
                j = r_get.json()
                state = j.get("state")
                if state in ("completed", "succeeded", "success"):
                    assets = j.get("assets")
                    if isinstance(assets, dict):
                        image_url = assets.get("image") or assets.get("url")
                    elif isinstance(assets, list):
                        for a in assets:
                            if isinstance(a, dict):
                                image_url = a.get("image") or a.get("url")
                                if image_url:
                                    break
                    if not image_url:
                        image_url = j.get("image") or j.get("url")
                    break
                if state in ("failed", "error"):
                    raise HTTPException(status_code=502, detail=f"Luma image generation failed: {j.get('error')}")
                import time as _t
                _t.sleep(2)

            if not image_url:
                raise HTTPException(status_code=504, detail="Luma image generation timed out or missing image URL")

            # Download and upload to MinIO
            r_img = requests.get(image_url, timeout=60)
            if not r_img.ok:
                raise HTTPException(status_code=502, detail=f"Failed to fetch Luma image: {r_img.status_code}")
            image_bytes = r_img.content
            # Guess content type
            ct = r_img.headers.get("Content-Type", "image/jpeg")
            if "/png" in ct:
                content_type = "image/png"
                ext = "png"
            else:
                content_type = "image/jpeg"
                ext = "jpg"
            object_name = f"generated/images/{uuid.uuid4().hex}.{ext}"
            saved_key = _upload_bytes(object_name, image_bytes, content_type)
            return {"uri": saved_key, "content_type": content_type}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Luma image generation failed: {e}")

    elif provider == "google":
        # Prefer Vertex AI if project/location are configured; otherwise fallback to Google AI Studio (google-genai)
        g_project = os.getenv("GOOGLE_CLOUD_PROJECT")
        g_location = os.getenv("GOOGLE_CLOUD_LOCATION")
        g_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if g_project and g_location and g_creds:
            try:
                # Vertex AI (Imagen via ImageGenerationModel)
                import vertexai  # type: ignore
                from vertexai.preview.vision_models import ImageGenerationModel  # type: ignore
                from google.oauth2 import service_account  # type: ignore

                # Load explicit credentials from file to avoid ADC ambiguity on Windows
                try:
                    credentials = service_account.Credentials.from_service_account_file(
                        g_creds,
                        scopes=["https://www.googleapis.com/auth/cloud-platform"],
                    )
                except Exception as cred_err:
                    raise HTTPException(status_code=500, detail=f"Vertex credentials load failed: {cred_err}")

                vertexai.init(project=g_project, location=g_location, credentials=credentials)

                # Use Imagen 3 model IDs directly (e.g., 'imagen-3.0-fast')
                # Try a list of known Imagen model ids (order matters per availability/region)
                candidate_models = [
                    model or "",
                    "imagen-3.0-fast",
                    "imagen-3.0",
                    "imagen-3.0-generate-002",
                    "imagegeneration@006",
                    "imagegeneration@005",
                ]
                img_model = None
                last_err: Exception | None = None
                for m in [c for c in candidate_models if c]:
                    try:
                        img_model = ImageGenerationModel.from_pretrained(m)
                        vertex_model = m
                        break
                    except Exception as e:
                        last_err = e
                        continue
                if img_model is None:
                    raise HTTPException(status_code=404, detail=f"No available Vertex Imagen model in this region: {last_err}")

                # Try width/height first; fall back to aspect ratio only if needed
                # Vertex Imagen accepts aspect_ratio values like '16:9', '1:1', '9:16'
                w_req, h_req = body.width, body.height
                ratio = (w_req / h_req) if h_req else (16/9)
                if abs(ratio - 1.0) < 0.02:
                    ar = "1:1"
                elif ratio < 1.0:
                    ar = "9:16"
                else:
                    ar = "16:9"
                try:
                    gen = img_model.generate_images(
                        prompt=prompt,
                        number_of_images=1,
                        aspect_ratio=ar,
                    )
                except Exception as e_ar:
                    # If aspect_ratio also fails, allow Studio fallback below
                    raise HTTPException(status_code=502, detail=f"Vertex error: {e_ar}")

                images = getattr(gen, "images", None) or gen
                if not images:
                    raise HTTPException(status_code=502, detail="Vertex AI did not return image data")

                img0 = images[0]
                # Vertex returns PIL.Image.Image or bytes depending on version
                if hasattr(img0, "to_bytes"):
                    image_bytes = img0.to_bytes()
                elif hasattr(img0, "_pil_image") and img0._pil_image:
                    buf = io.BytesIO()
                    img0._pil_image.save(buf, format="PNG")
                    image_bytes = buf.getvalue()
                elif isinstance(img0, bytes):
                    image_bytes = img0
                else:
                    # Attempt generic serialization
                    try:
                        buf = io.BytesIO()
                        img0.save(buf, format="PNG")
                        image_bytes = buf.getvalue()
                    except Exception:
                        raise HTTPException(status_code=502, detail="Unsupported Vertex image response format")
            except HTTPException as he:
                # Try Studio fallback if API key is present
                api_key = os.getenv("GOOGLE_API_KEY")
                if api_key:
                    try:
                        from google import genai
                        client = genai.Client(api_key=api_key)
                        resp = client.models.generate_images(
                            model="imagen-3.0",  # default
                            prompt=prompt,
                            width=body.width,
                            height=body.height,
                        )
                        if not resp or not getattr(resp, "images", None):
                            raise HTTPException(status_code=502, detail="Google did not return image data")
                        img0 = resp.images[0]
                        if hasattr(img0, "bytes") and img0.bytes:
                            image_bytes = img0.bytes
                        elif hasattr(img0, "data") and img0.data:
                            image_bytes = img0.data
                        elif hasattr(img0, "base64") and img0.base64:
                            image_bytes = base64.b64decode(img0.base64)
                        else:
                            raise HTTPException(status_code=502, detail="Unsupported Google image response format")
                    except Exception as se:
                        raise HTTPException(status_code=500, detail=f"Google (Studio) image generation failed: {se}")
                else:
                    raise he
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Vertex AI image generation failed: {e}")
        else:
            try:
                # Google AI Studio (google-genai)
                from google import genai

                api_key = os.getenv("GOOGLE_API_KEY")
                if not api_key:
                    raise HTTPException(status_code=400, detail="GOOGLE_API_KEY is not set (or configure Vertex AI env vars)")

                client = genai.Client(api_key=api_key)
                resp = client.models.generate_images(
                    model=model,
                    prompt=prompt,
                    width=body.width,
                    height=body.height,
                )
                if not resp or not getattr(resp, "images", None):
                    raise HTTPException(status_code=502, detail="Google did not return image data")
                img0 = resp.images[0]
                if hasattr(img0, "bytes") and img0.bytes:
                    image_bytes = img0.bytes
                elif hasattr(img0, "data") and img0.data:
                    image_bytes = img0.data
                elif hasattr(img0, "base64") and img0.base64:
                    image_bytes = base64.b64decode(img0.base64)
                else:
                    raise HTTPException(status_code=502, detail="Unsupported Google image response format")
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Google (Studio) image generation failed: {e}")

    else:
        raise HTTPException(status_code=400, detail="Unsupported provider. Use 'openai' or 'google'.")

    # Upload to object storage
    object_name = f"generated/images/{uuid.uuid4().hex}.png"
    saved_key = _upload_bytes(object_name, image_bytes, content_type)

    return {"uri": saved_key, "content_type": content_type}


@router.post("/video")
async def generate_video(body: GenerateVideoBody):
    provider = body.provider.lower()
    model = body.model

    # Log incoming prompt for video
    try:
        import logging
        logging.info(
            f"[GENERATE][video] provider={provider} model={model} size={body.width}x{body.height} duration={body.duration_seconds}s tags={body.tags} raw_prompt={body.prompt}"
        )
    except Exception:
        pass

    # Currently supported providers for video: luma, heygen
    if provider == "luma":
        try:
            from lumaai import LumaAI  # type: ignore
            import time
            import logging
            import requests

            api_key = os.getenv("LUMAAI_API_KEY")
            if not api_key:
                raise HTTPException(status_code=400, detail="LUMAAI_API_KEY is not set")

            client = LumaAI(auth_token=api_key)

            # Map requested size to aspect ratio string
            w, h = body.width, body.height
            ratio = (w / h) if h else (16/9)
            if abs(ratio - 1.0) < 0.02:
                ar = "1:1"
            elif ratio < 1.0:
                ar = "9:16"
            else:
                ar = "16:9"

            composed = _compose_prompt(body.prompt, body.tags, body.width, body.height)
            allowed_luma_models = {"ray-1-6", "ray-2", "ray-flash-2"}
            # Backward compatibility: map legacy names
            model_normalized = (model or "ray-1-6").lower()
            if model_normalized in {"dream-machine", "dream_machine", "dream"}:
                model_id = "ray-1-6"
            elif model_normalized in allowed_luma_models:
                model_id = model_normalized
            else:
                model_id = "ray-1-6"
            # Request a single output only
            gen = client.generations.create(
                model=model_id,
                prompt=composed,
                aspect_ratio=ar,
                loop=False,
            )

            gen_id = gen.id
            # Poll for completion
            for _ in range(150):  # poll up to ~5 minutes
                g = client.generations.get(id=gen_id)
                status = getattr(g, "state", None)
                if status in ("completed", "succeeded", "success"):
                    # Extract video url from various shapes
                    video_url = None
                    assets = getattr(g, "assets", None)
                    # Case 1: dict with 'video'
                    if isinstance(assets, dict):
                        video_url = assets.get("video") or assets.get("mp4") or assets.get("url")
                    # Case 2: list of assets
                    if not video_url and isinstance(assets, list):
                        for a in assets:
                            if isinstance(a, dict):
                                if a.get("type") == "video":
                                    video_url = a.get("url") or a.get("video")
                                    if video_url:
                                        break
                                # some responses might have direct mp4 url
                                video_url = video_url or a.get("mp4") or a.get("url")
                            else:
                                if hasattr(a, "type") and getattr(a, "type") == "video":
                                    video_url = getattr(a, "url", None) or getattr(a, "video", None)
                                    if video_url:
                                        break
                    # Case 3: top-level fields
                    if not video_url:
                        for key in ("video", "mp4", "url"):
                            if hasattr(g, key):
                                video_url = getattr(g, key)
                                if video_url:
                                    break
                    if not video_url:
                        logging.warning("Luma SDK returned no video URL; trying REST fallback fetch")
                        # Try REST fallback to fetch generation details
                        try:
                            api_key = os.getenv("LUMAAI_API_KEY")
                            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                            url = f"https://api.lumalabs.ai/dream-machine/v1/generations/{gen_id}"
                            r = requests.get(url, headers=headers, timeout=60)
                            if r.ok:
                                j = r.json()
                                assets_j = j.get("assets")
                                if isinstance(assets_j, dict):
                                    video_url = assets_j.get("video") or assets_j.get("mp4") or assets_j.get("url")
                                elif isinstance(assets_j, list):
                                    for a in assets_j:
                                        if isinstance(a, dict):
                                            if a.get("type") == "video":
                                                video_url = a.get("url") or a.get("video")
                                                if video_url:
                                                    break
                                            video_url = video_url or a.get("mp4") or a.get("url")
                                if not video_url:
                                    # sometimes top-level field
                                    video_url = j.get("video") or j.get("url")
                        except Exception as e_fetch:
                            logging.error(f"Luma REST fallback fetch failed: {e_fetch}")
                    if not video_url:
                        raise HTTPException(status_code=502, detail="Luma returned no video URL")

                    # Download and upload to MinIO
                    resp = requests.get(video_url, timeout=120)
                    if resp.status_code != 200:
                        raise HTTPException(status_code=502, detail=f"Failed to fetch Luma video: {resp.status_code}")
                    data = resp.content
                    object_name = f"generated/videos/{uuid.uuid4().hex}.mp4"
                    _upload_bytes(object_name, data, "video/mp4")
                    return {"uri": object_name, "content_type": "video/mp4"}
                if status in ("failed", "error"):
                    err = getattr(g, "error", None)
                    raise HTTPException(status_code=502, detail=f"Luma generation failed: {err}")
                time.sleep(2)

            raise HTTPException(status_code=504, detail="Luma generation timed out")
        except HTTPException:
            raise
        except Exception as e:
            # As a last resort, try raw REST flow to create/poll/download
            try:
                api_key = os.getenv("LUMAAI_API_KEY")
                headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                # map aspect ratio
                w, h = body.width, body.height
                ratio = (w / h) if h else (16/9)
                if abs(ratio - 1.0) < 0.02:
                    ar = "1:1"
                elif ratio < 1.0:
                    ar = "9:16"
                else:
                    ar = "16:9"
                payload = {
                    "model": (model or "ray-1-6"),
                    "prompt": _compose_prompt(body.prompt, body.tags, body.width, body.height),
                    "aspect_ratio": ar,
                    "loop": False,
                }
                r_create = requests.post("https://api.lumalabs.ai/dream-machine/v1/generations", json=payload, headers=headers, timeout=60)
                if not r_create.ok:
                    raise HTTPException(status_code=500, detail=f"Luma REST create failed: {r_create.status_code} {r_create.text}")
                gen_j = r_create.json()
                gen_id = gen_j.get("id")
                if not gen_id:
                    raise HTTPException(status_code=502, detail="Luma REST response missing id")
                # poll
                for _ in range(150):
                    r = requests.get(f"https://api.lumalabs.ai/dream-machine/v1/generations/{gen_id}", headers=headers, timeout=60)
                    if not r.ok:
                        time.sleep(2)
                        continue
                    j = r.json()
                    state = j.get("state")
                    if state in ("completed", "succeeded", "success"):
                        assets_j = j.get("assets")
                        video_url = None
                        if isinstance(assets_j, dict):
                            video_url = assets_j.get("video") or assets_j.get("mp4") or assets_j.get("url")
                        elif isinstance(assets_j, list):
                            for a in assets_j:
                                if isinstance(a, dict):
                                    if a.get("type") == "video":
                                        video_url = a.get("url") or a.get("video")
                                        if video_url:
                                            break
                                    video_url = video_url or a.get("mp4") or a.get("url")
                        if not video_url:
                            video_url = j.get("video") or j.get("url")
                        if not video_url:
                            raise HTTPException(status_code=502, detail="Luma returned no video URL (REST)")
                        resp = requests.get(video_url, timeout=120)
                        if resp.status_code != 200:
                            raise HTTPException(status_code=502, detail=f"Failed to fetch Luma video: {resp.status_code}")
                        data = resp.content
                        object_name = f"generated/videos/{uuid.uuid4().hex}.mp4"
                        _upload_bytes(object_name, data, "video/mp4")
                        return {"uri": object_name, "content_type": "video/mp4"}
                    if state in ("failed", "error"):
                        raise HTTPException(status_code=502, detail=f"Luma generation failed (REST): {j.get('error')}")
                    time.sleep(2)
                raise HTTPException(status_code=504, detail="Luma generation timed out (REST)")
            except HTTPException:
                raise
            except Exception as e2:
                raise HTTPException(status_code=500, detail=f"Luma video generation failed: {e2}")

    if provider == "heygen":
        try:
            import requests
            import time
            api_key = os.getenv("HEYGEN_API_KEY") or os.getenv("HEYGEN_APIKEY") or os.getenv("HEYGEN_KEY")
            if not api_key:
                raise HTTPException(status_code=400, detail="HEYGEN_API_KEY is not set")

            # Map width/height (HeyGen expects explicit dimension)
            w, h = body.width, body.height

            payload = {
                "video_inputs": [
                    {
                        "character": {
                            "type": "avatar",
                            "avatar_id": body.avatar_id or "",
                            "avatar_style": "normal"
                        },
                        "voice": {
                            "type": "text",
                            "input_text": body.prompt,
                            **({"voice_id": body.voice_id} if body.voice_id else {})
                        },
                        "background": {
                            "type": "color",
                            "value": "#FFFFFF"
                        }
                    }
                ],
                "dimension": {"width": w, "height": h}
            }

            headers = {"X-Api-Key": api_key, "Content-Type": "application/json", "Accept": "application/json"}
            r_create = requests.post("https://api.heygen.com/v2/video/generate", json=payload, headers=headers, timeout=60)
            if not r_create.ok:
                raise HTTPException(status_code=500, detail=f"HeyGen create failed: {r_create.status_code} {r_create.text}")
            gen = r_create.json()
            video_id = gen.get("data", {}).get("video_id") or gen.get("video_id")
            if not video_id:
                raise HTTPException(status_code=502, detail="HeyGen response missing video_id")

            # Poll status
            status_url = f"https://api.heygen.com/v1/video_status.get?video_id={video_id}"
            video_url = None
            for _ in range(180):
                r_stat = requests.get(status_url, headers={"X-Api-Key": api_key, "Accept": "application/json"}, timeout=30)
                if r_stat.ok:
                    js = r_stat.json()
                    status = js.get("data", {}).get("status") or js.get("status")
                    if status in ("completed", "completed_success", "success", "succeeded"):
                        video_url = js.get("data", {}).get("video_url") or js.get("video_url")
                        break
                    if status in ("failed", "error"):
                        raise HTTPException(status_code=502, detail=f"HeyGen generation failed: {js}")
                time.sleep(2)

            if not video_url:
                raise HTTPException(status_code=504, detail="HeyGen generation timed out or missing video_url")

            # Download and upload to MinIO
            resp = requests.get(video_url, timeout=120)
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Failed to fetch HeyGen video: {resp.status_code}")
            data = resp.content
            object_name = f"generated/videos/{uuid.uuid4().hex}.mp4"
            _upload_bytes(object_name, data, "video/mp4")
            return {"uri": object_name, "content_type": "video/mp4"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"HeyGen video generation failed: {e}")

    raise HTTPException(status_code=400, detail="Unsupported provider for video generation. Use 'luma' or 'heygen'.")


