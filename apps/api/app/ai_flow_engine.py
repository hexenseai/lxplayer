import json
import asyncio
from typing import Dict, List, Any, Optional
from enum import Enum
import logging
from openai import AsyncOpenAI
import os

logger = logging.getLogger(__name__)

# LLM Araçları tanımları
LLM_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "show_content",
            "description": "İçerik göstermek için bir pencere açılmasını tetikler",
            "parameters": {
                "type": "object",
                "properties": {
                    "content_id": {
                        "type": "string",
                        "description": "Gösterilecek içeriğin ID'si"
                    },
                    "message": {
                        "type": "string",
                        "description": "Kullanıcıya gösterilecek mesaj"
                    }
                },
                "required": ["content_id", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "translate_content",
            "description": "İçerik ve altyazı yazı dilinin İngilizce veya başka bir dilde tekrar düzenlenmesini ister",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_language": {
                        "type": "string",
                        "description": "Hedef dil (örn: 'en', 'de', 'fr')"
                    },
                    "content_type": {
                        "type": "string",
                        "enum": ["content", "subtitles", "both"],
                        "description": "Çevrilecek içerik tipi"
                    }
                },
                "required": ["target_language", "content_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "regenerate_content",
            "description": "İçerik ve altyazı yazılarının daha farklı olarak tekrar generate edilmesini sağlar",
            "parameters": {
                "type": "object",
                "properties": {
                    "content_type": {
                        "type": "string",
                        "enum": ["content", "subtitles", "both"],
                        "description": "Yeniden oluşturulacak içerik tipi"
                    },
                    "style": {
                        "type": "string",
                        "description": "İçerik stili (örn: 'formal', 'casual', 'technical')"
                    }
                },
                "required": ["content_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "jump_to_time",
            "description": "Video adımında farklı bir saniyeye geçer",
            "parameters": {
                "type": "object",
                "properties": {
                    "time_seconds": {
                        "type": "number",
                        "description": "Geçilecek saniye"
                    },
                    "message": {
                        "type": "string",
                        "description": "Kullanıcıya gösterilecek mesaj"
                    }
                },
                "required": ["time_seconds", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_overlay_list",
            "description": "Kullanıcıya overlays adımlarının bir listesini gösterir",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "Kullanıcıya gösterilecek mesaj"
                    }
                },
                "required": ["message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "control_video",
            "description": "Video kontrolü (durdur, sürdür, başlat, bitir)",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["play", "pause", "stop", "restart"],
                        "description": "Video kontrol aksiyonu"
                    },
                    "message": {
                        "type": "string",
                        "description": "Kullanıcıya gösterilecek mesaj"
                    }
                },
                "required": ["action", "message"]
            }
        }
    }
]

class NodeType(Enum):
    START = "start"
    SECTION = "section"
    PROMPT = "prompt"
    QUESTION = "question"
    CONTENT = "content"
    END = "end"

class FlowState:
    def __init__(self):
        self.current_node_id: Optional[str] = None
        self.visited_nodes: List[str] = []
        self.user_responses: Dict[str, str] = {}
        self.context: Dict[str, Any] = {}
        self.current_section: Optional[str] = None
        self.is_playing: bool = False
        
        # Yeni: Node durum takibi
        self.node_states: Dict[str, Dict[str, Any]] = {}  # Her node'un durumu
        self.message_history: Dict[str, List[Dict[str, Any]]] = {}  # Her node'un mesaj geçmişi
        self.section_interactions: Dict[str, List[Dict[str, Any]]] = {}  # Section içi etkileşimler
        self.return_stack: List[str] = []  # Geri dönüş yığını
        self.temp_node_id: Optional[str] = None  # Geçici node ID'si

class AIFlowEngine:
    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
        self.state = FlowState()
        self.flow_data = None  # Flow data'yı instance variable olarak ekle
        
    def load_flow(self, flow_json: str) -> Dict[str, Any]:
        """AI flow JSON'unu yükle ve doğrula"""
        try:
            flow_data = json.loads(flow_json)
            if not isinstance(flow_data, dict) or 'nodes' not in flow_data or 'edges' not in flow_data:
                raise ValueError("Invalid flow format")
            return flow_data
        except json.JSONDecodeError as e:
            logger.error(f"Flow JSON parse error: {e}")
            raise ValueError("Invalid JSON format")
    
    def get_node_by_id(self, flow_data: Dict[str, Any], node_id: str) -> Optional[Dict[str, Any]]:
        """Node ID'sine göre node'u bul"""
        for node in flow_data.get('nodes', []):
            if node.get('id') == node_id:
                return node
        return None
    
    def get_connected_nodes(self, flow_data: Dict[str, Any], node_id: str) -> List[Dict[str, Any]]:
        """Bir node'a bağlı diğer node'ları bul"""
        connected_nodes = []
        for edge in flow_data.get('edges', []):
            if edge.get('source') == node_id:
                target_node = self.get_node_by_id(flow_data, edge.get('target'))
                if target_node:
                    # Edge bilgilerini de ekle
                    edge_info = {
                        'node': target_node,
                        'edge_label': edge.get('label', ''),
                        'edge_id': edge.get('id', '')
                    }
                    connected_nodes.append(edge_info)
        return connected_nodes
    
    def get_next_node_by_condition(self, flow_data: Dict[str, Any], node_id: str, condition: str = None) -> Optional[Dict[str, Any]]:
        """Koşula göre sonraki node'u bul"""
        connected_edges = self.get_connected_nodes(flow_data, node_id)
        
        if not connected_edges:
            return None
        
        # Eğer koşul belirtilmişse, o koşula uyan edge'i bul
        if condition:
            for edge_info in connected_edges:
                edge_label = edge_info.get('edge_label', '').lower()
                if edge_label == condition.lower():
                    return edge_info['node']
                # Türkçe koşulları da kontrol et
                elif condition.lower() in ['hazır', 'ready'] and edge_label in ['hazır', 'ready']:
                    return edge_info['node']
                elif condition.lower() in ['eğitmen', 'instructor'] and edge_label in ['eğitmen', 'instructor']:
                    return edge_info['node']
                elif condition.lower() in ['evet', 'yes'] and edge_label in ['evet', 'yes']:
                    return edge_info['node']
                elif condition.lower() in ['hayır', 'no'] and edge_label in ['hayır', 'no']:
                    return edge_info['node']
        
        # Koşul belirtilmemişse veya bulunamazsa, ilk edge'i döndür
        return connected_edges[0]['node']
    
    def get_start_node(self, flow_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Başlangıç node'unu bul"""
        for node in flow_data.get('nodes', []):
            if node.get('type') == NodeType.START.value:
                return node
        return None
    
    async def execute_node(self, node: Dict[str, Any], user_message: str = "", training_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Bir node'u yürüt ve sonucu döndür"""
        node_type = node.get('type')
        node_data = node.get('data', {})
        
        logger.info(f"Executing node: {node.get('id')} of type: {node_type}")
        
        if node_type == NodeType.START.value:
            return await self.execute_start_node(node, training_context)
        elif node_type == NodeType.PROMPT.value:
            return await self.execute_prompt_node(node, user_message, training_context)
        elif node_type == NodeType.SECTION.value:
            return await self.execute_section_node(node, user_message, training_context)
        elif node_type == NodeType.QUESTION.value:
            return await self.execute_question_node(node, user_message, training_context)
        elif node_type == NodeType.CONTENT.value:
            return await self.execute_content_node(node, training_context)
        elif node_type == NodeType.END.value:
            return await self.execute_end_node(node, training_context)
        else:
            logger.warning(f"Unknown node type: {node_type}")
            return {"action": "continue", "message": "Bilinmeyen node tipi"}
    
    async def execute_start_node(self, node: Dict[str, Any], training_context: Dict[str, Any]) -> Dict[str, Any]:
        """Başlangıç node'unu yürüt"""
        node_data = node.get('data', {})
        welcome_message = node_data.get('prompt', 'Eğitime hoş geldiniz!')
        
        # Training başlığını context'e ekle
        if training_context:
            self.state.context['training_title'] = training_context.get('title', '')
            self.state.context['training_description'] = training_context.get('description', '')
        
        # Start node'dan sonra otomatik olarak ilk node'a geç
        connected = self.get_connected_nodes(self.flow_data, node.get('id'))
        next_node = connected[0]['node'] if connected else None
        return {
            "action": "continue",
            "message": "",  # Başlangıçta mesaj göstermeyelim
            "next_node": next_node,
            "waiting_for_response": False
        }
    
    async def execute_prompt_node(self, node: Dict[str, Any], user_message: str, training_context: Dict[str, Any]) -> Dict[str, Any]:
        """Prompt node'unu yürüt - LLM araçları ile"""
        node_data = node.get('data', {})
        prompt_text = node_data.get('prompt', '')
        purpose = node_data.get('purpose', '')  # Yeni: Amaç alanı
        initial_message = node_data.get('initial_message', '')  # Yeni: İlk mesaj alanı
        node_label = node_data.get('label', 'Prompt')
        
        # Eğer kullanıcı mesajı varsa, prompt'u kullanıcı mesajıyla birleştir
        if user_message:
            full_prompt = f"{prompt_text}\n\nKullanıcı: {user_message}"
        else:
            # İlk mesaj alanı varsa onu kullan, yoksa prompt'u kullan
            if initial_message:
                full_prompt = initial_message
            else:
                full_prompt = prompt_text
        
        # Node durumunu kontrol et - eğer ilk kez çalışıyorsa LLM'in initial_message'ı işlemesini sağla
        node_state = self.get_node_state(node.get('id'))
        is_first_run = not node_state.get('has_run', False)
        
        if is_first_run and initial_message:
            # İlk çalıştırma - LLM'in initial_message talimatını işlemesini sağla
            self.save_node_state(node.get('id'), {'has_run': True})
            
            try:
                # LLM'e initial_message talimatını ver ve uygun bir mesaj oluşturmasını iste
                system_prompt = f"""Sen bir eğitim asistanısın. Aşağıdaki talimatı kullanarak kullanıcıya uygun bir mesaj oluştur:
                
                Talimat: {initial_message}
                Eğitim Konusu: {training_context.get('title', '') if training_context else ''}
                
                Kurallar:
                - Talimatı doğrudan kopyalama, onu doğal bir konuşma diline çevir
                - Samimi ve yardımcı ol
                - Kısa ve öz yanıt ver (maksimum 50 kelime)
                - Türkçe yanıt ver
                - Kullanıcıdan yanıt bekle
                - Talimatın ruhunu koru ama doğal bir şekilde ifade et
                """
                
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Bu talimatı kullanarak kullanıcıya mesaj oluştur: {initial_message}"}
                    ],
                    max_tokens=100,
                    temperature=0.7
                )
                
                ai_response = response.choices[0].message.content or initial_message
                
                return {
                    "action": "respond",
                    "message": ai_response,
                    "node_label": node_label,
                    "purpose_completed": False,
                    "next_node": None,  # Kullanıcı yanıtı bekleniyor
                    "waiting_for_response": True
                }
                
            except Exception as e:
                logger.error(f"Initial message generation error: {e}")
                # Hata durumunda fallback olarak initial_message'ı kullan
                return {
                    "action": "respond",
                    "message": initial_message,
                    "node_label": node_label,
                    "purpose_completed": False,
                    "next_node": None,
                    "waiting_for_response": True
                }
        
        # Eğer ilk çalıştırma değilse ve kullanıcı mesajı yoksa, LLM'in prompt'u işlemesini sağla
        if not user_message and not is_first_run:
            try:
                system_prompt = f"""Sen bir eğitim asistanısın. Aşağıdaki prompt'u kullanarak kullanıcıya yanıt ver:
                
                Prompt: {prompt_text}
                Amaç: {purpose}
                
                Eğitim Konusu: {training_context.get('title', '') if training_context else ''}
                
                Kurallar:
                - Kısa ve öz yanıtlar ver (maksimum 100 kelime)
                - Samimi ve yardımcı ol
                - Eğitim akışına uygun hareket et
                - Türkçe yanıt ver
                - Kullanıcının isteklerine göre uygun araçları kullan
                - Amaç tamamlandığında bir sonraki adıma geç
                - Her zaman kullanıcıdan yanıt bekle ve aktif ol
                
                Kullanabileceğin araçlar:
                - show_content: İçerik göstermek için
                - translate_content: İçerik çevirmek için
                - regenerate_content: İçerik yeniden oluşturmak için
                - jump_to_time: Video'da belirli saniyeye geçmek için
                - show_overlay_list: Overlay listesi göstermek için
                - control_video: Video kontrolü için"""
                
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt_text}
                    ],
                    max_tokens=150,
                    temperature=0.7
                )
                
                ai_response = response.choices[0].message.content or "Merhaba! Size nasıl yardımcı olabilirim?"
                
                return {
                    "action": "respond",
                    "message": ai_response,
                    "node_label": node_label,
                    "purpose_completed": False,
                    "next_node": None,
                    "waiting_for_response": True
                }
                
            except Exception as e:
                logger.error(f"Prompt processing error: {e}")
                ai_response = "Merhaba! Size nasıl yardımcı olabilirim?"
                
                return {
                    "action": "respond",
                    "message": ai_response,
                    "node_label": node_label,
                    "purpose_completed": False,
                    "next_node": None,
                    "waiting_for_response": True
                }
        
        # OpenAI ile yanıt oluştur - araçlar ile
        try:
            system_prompt = f"""Sen bir eğitim asistanısın. Aşağıdaki prompt'u kullanarak kullanıcıya yanıt ver:
            
            Prompt: {prompt_text}
            Amaç: {purpose}
            
            Eğitim Konusu: {training_context.get('title', '') if training_context else ''}
            
            Kurallar:
            - Kısa ve öz yanıtlar ver (maksimum 100 kelime)
            - Samimi ve yardımcı ol
            - Eğitim akışına uygun hareket et
            - Türkçe yanıt ver
            - Kullanıcının isteklerine göre uygun araçları kullan
            - Amaç tamamlandığında bir sonraki adıma geç
            - Her zaman kullanıcıdan yanıt bekle ve aktif ol
            
            Kullanabileceğin araçlar:
            - show_content: İçerik göstermek için
            - translate_content: İçerik çevirmek için
            - regenerate_content: İçerik yeniden oluşturmak için
            - jump_to_time: Video'da belirli saniyeye geçmek için
            - show_overlay_list: Overlay listesi göstermek için
            - control_video: Video kontrolü için"""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_prompt}
            ]
            
            # Eğer kullanıcı mesajı varsa, araçları kullan
            if user_message:
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    tools=LLM_TOOLS,
                    tool_choice="auto",
                    max_tokens=300,
                    temperature=0.7
                )
                
                # Araç çağrısı var mı kontrol et
                if response.choices[0].message.tool_calls:
                    tool_call = response.choices[0].message.tool_calls[0]
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    # Aracı yürüt
                    tool_result = await self.execute_tool_call(tool_name, tool_args)
                    
                    # Araç sonucunu LLM'e gönder
                    messages.append(response.choices[0].message)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(tool_result)
                    })
                    
                    # Final yanıtı al
                    final_response = await self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                        max_tokens=200,
                        temperature=0.7
                    )
                    
                    ai_response = final_response.choices[0].message.content or "Araç yürütüldü."
                else:
                    ai_response = response.choices[0].message.content or "Anladım, size yardımcı olmaya çalışıyorum."
            else:
                # İlk mesaj - sadece prompt'u göster
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    max_tokens=150,
                    temperature=0.7
                )
                ai_response = response.choices[0].message.content or "Merhaba! Size nasıl yardımcı olabilirim?"
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            ai_response = "Üzgünüm, şu anda yanıt veremiyorum."
        
        # Kullanıcı yanıtını kaydet
        if user_message:
            self.state.user_responses[node.get('id')] = user_message
        
        # Amaç tamamlanma kontrolü - eğer amaç varsa ve kullanıcı mesajı geldiyse
        purpose_completed = False
        if purpose and user_message:
            try:
                completion_check_prompt = f"""Aşağıdaki amaç tamamlandı mı kontrol et:
                
                Amaç: {purpose}
                Kullanıcı Yanıtı: {user_message}
                
                Amaç tamamlandıysa "completed", tamamlanmadıysa "not_completed" yanıtını ver.
                Örnek: Kullanıcı eğitime başlamaya hazır olduğunda devam et -> kullanıcı "hazırım" dediğinde "completed"
                Örnek: Eğitmen hakkında bilgi isterse eğitmen üzerinden devam et -> kullanıcı "eğitmen" dediğinde "completed"
                """
                
                completion_response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Sen bir amaç tamamlanma kontrolörüsün. Sadece 'completed' veya 'not_completed' yanıtını ver."},
                        {"role": "user", "content": completion_check_prompt}
                    ],
                    max_tokens=10,
                    temperature=0.1
                )
                
                completion_result = completion_response.choices[0].message.content or "not_completed"
                purpose_completed = "completed" in completion_result.lower()
                
                logger.info(f"Purpose completion check: {purpose} -> {completion_result} (completed: {purpose_completed})")
                
            except Exception as e:
                logger.error(f"Purpose completion check error: {e}")
                purpose_completed = False
        
        # Eğer amaç tamamlandıysa, bir sonraki node'a geç
        next_node = None
        if purpose_completed:
            connected_edges = self.get_connected_nodes(self.flow_data, node.get('id'))
            if connected_edges:
                # Kullanıcı mesajına göre uygun edge'i seç
                user_message_lower = user_message.lower()
                
                # Edge'leri logla
                logger.info(f"Available edges: {[edge.get('edge_label', 'no-label') for edge in connected_edges]}")
                logger.info(f"User message: {user_message_lower}")
                
                # Önce özel koşulları kontrol et
                if any(word in user_message_lower for word in ['hazır', 'ready', 'başla', 'devam']):
                    # "hazır" edge'ini ara
                    for edge_info in connected_edges:
                        edge_label = edge_info.get('edge_label', '').lower()
                        if edge_label in ['hazır', 'ready']:
                            next_node = edge_info['node']
                            logger.info(f"Selected 'hazır' edge: {edge_label}")
                            break
                elif any(word in user_message_lower for word in ['eğitmen', 'instructor', 'kim', 'hakkında']):
                    # "eğitmen" edge'ini ara
                    for edge_info in connected_edges:
                        edge_label = edge_info.get('edge_label', '').lower()
                        if edge_label in ['eğitmen', 'instructor']:
                            next_node = edge_info['node']
                            logger.info(f"Selected 'eğitmen' edge: {edge_label}")
                            break
                elif any(word in user_message_lower for word in ['evet', 'yes', 'tamam', 'ok']):
                    # "evet" edge'ini ara
                    for edge_info in connected_edges:
                        edge_label = edge_info.get('edge_label', '').lower()
                        if edge_label in ['evet', 'yes']:
                            next_node = edge_info['node']
                            logger.info(f"Selected 'evet' edge: {edge_label}")
                            break
                elif any(word in user_message_lower for word in ['hayır', 'no', 'istemiyorum']):
                    # "hayır" edge'ini ara
                    for edge_info in connected_edges:
                        edge_label = edge_info.get('edge_label', '').lower()
                        if edge_label in ['hayır', 'no']:
                            next_node = edge_info['node']
                            logger.info(f"Selected 'hayır' edge: {edge_label}")
                            break
                
                # Uygun edge bulunamazsa, edge label'ı olmayan ilk edge'i kullan
                if not next_node:
                    # Önce label'ı olmayan edge'leri ara
                    for edge_info in connected_edges:
                        if not edge_info.get('edge_label', '').strip():
                            next_node = edge_info['node']
                            logger.info("Selected edge with no label (default)")
                            break
                    
                    # Hala bulunamazsa ilk edge'i kullan
                    if not next_node:
                        next_node = connected_edges[0]['node']
                        logger.info(f"Selected first edge: {connected_edges[0].get('edge_label', 'no-label')}")
                
                self.state.current_node_id = next_node.get('id')
                self.state.visited_nodes.append(node.get('id'))
        
        return {
            "action": "respond",
            "message": ai_response,
            "node_label": node_label,
            "purpose_completed": purpose_completed,
            "next_node": next_node
        }
    
    async def execute_section_node(self, node: Dict[str, Any], user_message: str, training_context: Dict[str, Any]) -> Dict[str, Any]:
        """Section node'unu yürüt - LLM aktif ve overlay etkileşimleri destekli"""
        node_data = node.get('data', {})
        section_id = node_data.get('section_id')
        section_title = node_data.get('label', 'Bölüm')
        node_id = node.get('id')
        
        # Node durumunu al
        node_state = self.get_node_state(node_id)
        message_history = self.get_node_message_history(node_id)
        
        if section_id:
            self.state.current_section = section_id
            self.state.is_playing = True
            
            # Section başlatma kontrolü
            is_first_run = not node_state.get('has_run', False)
            
            if is_first_run:
                # İlk kez section başlıyor - video başlat ve karşılama mesajı gönder
                self.save_node_state(node_id, {'has_run': True})
                
                return {
                    "action": "play_section",
                    "message": "",  # Açılışta metin yazma
                    "section_id": section_id,
                    "message_history": message_history,
                    "section_interactions": self.get_section_interactions(section_id),
                    "next_node": self.get_connected_nodes(self.flow_data, node.get('id'))[0]['node'] if self.get_connected_nodes(self.flow_data, node.get('id')) else None,
                    "start_video": False
                }
            
            # Section etkileşimlerini al
            section_interactions = self.get_section_interactions(section_id)
            
            # Eğer kullanıcı mesajı varsa (overlay button tıklaması veya LLM mesajı)
            if user_message:
                # Section etkileşimini kaydet
                interaction = {
                    "timestamp": asyncio.get_event_loop().time(),
                    "message": user_message,
                    "type": "user_input"
                }
                self.add_section_interaction(section_id, interaction)
                
                # LLM'e section içi mesajı işlet
                try:
                    system_prompt = f"""Sen bir eğitim asistanısın. {section_title} bölümünde kullanıcı size mesaj gönderdi.
                    
                    Eğitim Konusu: {training_context.get('title', '') if training_context else ''}
                    Mevcut Bölüm: {section_title}
                    
                    Kullanıcı Mesajı: {user_message}
                    
                    Kurallar:
                    - Kullanıcının mesajına yanıt ver
                    - Video içeriği hakkında sorulara cevap ver
                    - Overlay noktaları arasında geçiş yapabilirsin
                    - Gerekirse başka bir node'a geçiş önerebilirsin
                    - Kullanıcıdan yanıt bekle
                    - Türkçe yanıt ver
                    - Kullanıcının isteklerine göre uygun araçları kullan
                    
                    Kullanabileceğin araçlar:
                    - show_content: İçerik göstermek için
                    - translate_content: İçerik çevirmek için
                    - regenerate_content: İçerik yeniden oluşturmak için
                    - jump_to_time: Video'da belirli saniyeye geçmek için
                    - show_overlay_list: Overlay listesi göstermek için
                    - control_video: Video kontrolü için
                    - navigate_to_node: Başka bir node'a geçmek için
                    - return_to_section: Section'a geri dönmek için"""
                    
                    # Mesaj geçmişini ekle
                    messages = [
                        {"role": "system", "content": system_prompt}
                    ]
                    
                    # Önceki mesajları ekle (son 5 mesaj)
                    for msg in message_history[-5:]:
                        messages.append(msg)
                    
                    messages.append({"role": "user", "content": user_message})
                    
                    response = await self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=messages,
                        tools=LLM_TOOLS + [
                            {
                                "type": "function",
                                "function": {
                                    "name": "navigate_to_node",
                                    "description": "Başka bir node'a geçmek için kullanılır",
                                    "parameters": {
                                        "type": "object",
                                        "properties": {
                                            "target_node_id": {
                                                "type": "string",
                                                "description": "Gidilecek node'un ID'si"
                                            },
                                            "reason": {
                                                "type": "string",
                                                "description": "Geçiş sebebi"
                                            },
                                            "return_after": {
                                                "type": "boolean",
                                                "description": "İşlem bitince geri dönülsün mü?"
                                            }
                                        },
                                        "required": ["target_node_id", "reason"]
                                    }
                                }
                            },
                            {
                                "type": "function",
                                "function": {
                                    "name": "return_to_section",
                                    "description": "Section'a geri dönmek için kullanılır",
                                    "parameters": {
                                        "type": "object",
                                        "properties": {
                                            "message": {
                                                "type": "string",
                                                "description": "Geri dönüş mesajı"
                                            }
                                        },
                                        "required": ["message"]
                                    }
                                }
                            }
                        ],
                        tool_choice="auto",
                        max_tokens=300,
                        temperature=0.7
                    )
                    
                    # Araç çağrısı var mı kontrol et
                    if response.choices[0].message.tool_calls:
                        tool_call = response.choices[0].message.tool_calls[0]
                        tool_name = tool_call.function.name
                        tool_args = json.loads(tool_call.function.arguments)
                        
                        if tool_name == "navigate_to_node":
                            # Başka bir node'a geç
                            target_node_id = tool_args.get("target_node_id")
                            reason = tool_args.get("reason", "")
                            return_after = tool_args.get("return_after", False)
                            
                            # Mevcut node'u geri dönüş yığınına ekle
                            if return_after:
                                self.push_return_stack(node_id)
                            
                            # Geçici node'u ayarla
                            self.set_temp_node(target_node_id)
                            
                            # Node durumunu güncelle
                            self.save_node_state(node_id, {
                                "last_interaction": user_message,
                                "pending_return": return_after
                            })
                            
                            # Mesaj geçmişini kaydet
                            self.add_message_to_history(node_id, {
                                "role": "user",
                                "content": user_message,
                                "timestamp": asyncio.get_event_loop().time()
                            })
                            self.add_message_to_history(node_id, {
                                "role": "assistant",
                                "content": "Node'a geçiliyor: " + reason,
                                "timestamp": asyncio.get_event_loop().time()
                            })
                            
                            return {
                                "action": "navigate_to_node",
                                "message": f"Node'a geçiliyor: {reason}",
                                "target_node_id": target_node_id,
                                "return_after": return_after,
                                "section_id": section_id
                            }
                        
                        elif tool_name == "return_to_section":
                            # Section'a geri dön
                            message = tool_args.get("message", "Section'a geri döndünüz.")
                            
                            # Geri dönüş yığınından node al
                            return_node_id = self.pop_return_stack()
                            if return_node_id:
                                self.state.current_node_id = return_node_id
                                self.clear_temp_node()
                            
                            self.add_message_to_history(node_id, {
                                "role": "user",
                                "content": user_message,
                                "timestamp": asyncio.get_event_loop().time()
                            })
                            self.add_message_to_history(node_id, {
                                "role": "assistant",
                                "content": message,
                                "timestamp": asyncio.get_event_loop().time()
                            })
                            
                            return {
                                "action": "return_to_section",
                                "message": message,
                                "section_id": section_id,
                                "return_node_id": return_node_id
                            }
                        
                        else:
                            # Diğer araçları yürüt
                            tool_result = await self.execute_tool_call(tool_name, tool_args)
                            
                            # Araç sonucunu LLM'e gönder
                            messages.append(response.choices[0].message)
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tool_call.id,
                                "content": json.dumps(tool_result)
                            })
                            
                            # Final yanıtı al
                            final_response = await self.client.chat.completions.create(
                                model="gpt-4o-mini",
                                messages=messages,
                                max_tokens=200,
                                temperature=0.7
                            )
                            
                            ai_response = final_response.choices[0].message.content or "Araç yürütüldü."
                    else:
                        ai_response = response.choices[0].message.content or "Anladım, size yardımcı olmaya çalışıyorum."
                    
                    # Mesaj geçmişini kaydet
                    self.add_message_to_history(node_id, {
                        "role": "user",
                        "content": user_message,
                        "timestamp": asyncio.get_event_loop().time()
                    })
                    self.add_message_to_history(node_id, {
                        "role": "assistant",
                        "content": ai_response,
                        "timestamp": asyncio.get_event_loop().time()
                    })
                    
                except Exception as e:
                    logger.error(f"Section LLM error: {e}")
                    ai_response = "Anladım, size yardımcı olmaya çalışıyorum."
                
                return {
                    "action": "section_interaction",
                    "message": ai_response,
                    "section_id": section_id,
                    "message_history": message_history,
                    "section_interactions": section_interactions
                }
            
            else:
                # İlk kez section başlıyor
                try:
                    system_prompt = f"""Sen bir eğitim asistanısın. {section_title} bölümü başladı.
                    
                    Eğitim Konusu: {training_context.get('title', '') if training_context else ''}
                    
                    Kurallar:
                    - Bölüm başladığını bildir
                    - Kullanıcıya nasıl yardımcı olabileceğini sor
                    - Video içeriği hakkında sorulara cevap ver
                    - Overlay noktaları arasında geçiş yapabilirsin
                    - Kullanıcıdan yanıt bekle
                    - Türkçe yanıt ver
                    - Kullanıcının isteklerine göre uygun araçları kullan
                    
                    Kullanabileceğin araçlar:
                    - show_content: İçerik göstermek için
                    - translate_content: İçerik çevirmek için
                    - regenerate_content: İçerik yeniden oluşturmak için
                    - jump_to_time: Video'da belirli saniyeye geçmek için
                    - show_overlay_list: Overlay listesi göstermek için
                    - control_video: Video kontrolü için"""
                    
                    response = await self.client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": f"{section_title} bölümü başladı. Size nasıl yardımcı olabilirim?"}
                        ],
                        tools=LLM_TOOLS,
                        tool_choice="auto",
                        max_tokens=200,
                        temperature=0.7
                    )
                    
                    ai_response = response.choices[0].message.content or f"{section_title} bölümü başladı. Size nasıl yardımcı olabilirim?"
                    
                except Exception as e:
                    logger.error(f"Section node LLM error: {e}")
                    ai_response = f"{section_title} bölümü başladı. Size nasıl yardımcı olabilirim?"
                
                # İlk mesajı geçmişe ekle
                self.add_message_to_history(node_id, {
                    "role": "assistant",
                    "content": ai_response,
                    "timestamp": asyncio.get_event_loop().time()
                })
                
                return {
                    "action": "play_section",
                    "message": "",
                    "section_id": section_id,
                    "message_history": message_history,
                    "section_interactions": section_interactions,
                    "next_node": self.get_connected_nodes(self.flow_data, node.get('id'))[0]['node'] if self.get_connected_nodes(self.flow_data, node.get('id')) else None
                }
        else:
            return {
                "action": "continue",
                "message": f"{section_title} bölümü",
                "next_node": self.get_connected_nodes(self.flow_data, node.get('id'))[0]['node'] if self.get_connected_nodes(self.flow_data, node.get('id')) else None
            }
    
    async def execute_question_node(self, node: Dict[str, Any], user_message: str, training_context: Dict[str, Any]) -> Dict[str, Any]:
        """Question node'unu yürüt"""
        node_data = node.get('data', {})
        question_text = node_data.get('question', '')
        node_label = node_data.get('label', 'Soru')
        
        # Node durumunu kontrol et
        node_state = self.get_node_state(node.get('id'))
        is_first_run = not node_state.get('has_run', False)
        
        if is_first_run:
            # İlk kez soru gösteriliyor - soruyu gönder ve yanıt bekle
            self.save_node_state(node.get('id'), {'has_run': True})
            return {
                "action": "ask_question",
                "message": question_text,
                "question": question_text,
                "node_label": node_label,
                "next_node": None,
                "waiting_for_response": True
            }
        
        # Kullanıcı yanıtını kaydet
        if user_message:
            self.state.user_responses[node.get('id')] = user_message
            
            # Yanıtı analiz et ve uygun branch'i seç
            try:
                system_prompt = f"""Kullanıcının yanıtını analiz et ve uygun branch'i seç:
                
                Soru: {question_text}
                Kullanıcı Yanıtı: {user_message}
                
                Yanıtı analiz et ve şu kriterlere göre değerlendir:
                - Doğru/yanlış
                - Anlayış seviyesi
                - Detay seviyesi
                
                Sadece "correct" veya "incorrect" yanıtını ver."""
                
                response = await self.client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    max_tokens=10,
                    temperature=0.1
                )
                
                evaluation = response.choices[0].message.content or "incorrect"
                
                # Branch'e göre next node'u belirle
                connected_edges = self.get_connected_nodes(self.flow_data, node.get('id'))
                next_node = None
                
                if len(connected_edges) >= 2:
                    user_message_lower = user_message.lower()
                    
                    # Kullanıcı yanıtına göre uygun edge'i seç
                    if any(word in user_message_lower for word in ['evet', 'yes', 'tamam', 'ok', 'izlemek']):
                        # "evet" edge'ini ara
                        for edge_info in connected_edges:
                            if edge_info.get('edge_label', '').lower() in ['evet', 'yes']:
                                next_node = edge_info['node']
                                break
                    elif any(word in user_message_lower for word in ['hayır', 'no', 'istemiyorum', 'geç']):
                        # "hayır" edge'ini ara
                        for edge_info in connected_edges:
                            if edge_info.get('edge_label', '').lower() in ['hayır', 'no']:
                                next_node = edge_info['node']
                                break
                    
                    # Uygun edge bulunamazsa ilk edge'i kullan
                    if not next_node:
                        next_node = connected_edges[0]['node']
                else:
                    next_node = connected_edges[0]['node'] if connected_edges else None
                
                feedback = "Doğru yanıt!" if "correct" in evaluation.lower() else "Yanıtınızı tekrar düşünün."
                
            except Exception as e:
                logger.error(f"Question evaluation error: {e}")
                next_node = self.get_connected_nodes(self.flow_data, node.get('id'))[0]['node'] if self.get_connected_nodes(self.flow_data, node.get('id')) else None
                feedback = "Yanıtınız alındı."
        else:
            # İlk kez soru gösteriliyor
            next_node = None
            feedback = question_text
        
        return {
            "action": "ask_question",
            "message": question_text if not user_message else feedback,
            "question": question_text,
            "node_label": node_label,
            "next_node": next_node
        }
    
    async def execute_content_node(self, node: Dict[str, Any], training_context: Dict[str, Any]) -> Dict[str, Any]:
        """Content node'unu yürüt"""
        node_data = node.get('data', {})
        content_id = node_data.get('content_id')
        content_title = node_data.get('label', 'İçerik')
        
        return {
            "action": "show_content",
            "message": f"{content_title} içeriği gösteriliyor...",
            "content_id": content_id,
            "next_node": self.get_connected_nodes(self.flow_data, node.get('id'))[0]['node'] if self.get_connected_nodes(self.flow_data, node.get('id')) else None
        }
    
    async def execute_end_node(self, node: Dict[str, Any], training_context: Dict[str, Any]) -> Dict[str, Any]:
        """End node'unu yürüt"""
        node_data = node.get('data', {})
        end_message = node_data.get('message', 'Eğitim tamamlandı!')
        
        self.state.is_playing = False
        
        return {
            "action": "end_training",
            "message": end_message,
            "next_node": None
        }
    
    async def execute_flow(self, flow_json: str, user_message: str = "", training_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """AI flow'u yürüt - Her adımda LLM aktif ve durum takibi destekli"""
        try:
            # Flow'u yükle
            self.flow_data = self.load_flow(flow_json)
            
            # Eğer başlangıçta ise, start node'u bul
            if not self.state.current_node_id:
                start_node = self.get_start_node(self.flow_data)
                if start_node:
                    self.state.current_node_id = start_node.get('id')
                else:
                    return {"error": "Start node bulunamadı"}
            
            # Geçici node kontrolü
            if self.state.temp_node_id:
                # Geçici node'dan çalış
                current_node = self.get_node_by_id(self.flow_data, self.state.temp_node_id)
                if not current_node:
                    return {"error": "Geçici node bulunamadı"}
                
                # Node'u yürüt
                result = await self.execute_node(current_node, user_message, training_context)
                
                # Eğer node tamamlandıysa ve geri dönüş bekleniyorsa
                if result.get('action') in ['end_training', 'continue'] and self.state.return_stack:
                    return_node_id = self.pop_return_stack()
                    if return_node_id:
                        self.state.current_node_id = return_node_id
                        self.clear_temp_node()
                        
                        # Geri dönüş node'unu yürüt
                        return_node = self.get_node_by_id(self.flow_data, return_node_id)
                        if return_node:
                            return_result = await self.execute_node(return_node, "", training_context)
                            return_result["message"] = "Geri döndünüz. " + return_result.get("message", "")
                            return return_result
                
                return result
            
            # Mevcut node'u al
            current_node = self.get_node_by_id(self.flow_data, self.state.current_node_id)
            if not current_node:
                return {"error": "Mevcut node bulunamadı"}
            
            # Node'u yürüt
            result = await self.execute_node(current_node, user_message, training_context)
            
            # Node durumunu kaydet
            node_state = {
                "last_execution": asyncio.get_event_loop().time(),
                "last_action": result.get('action'),
                "last_message": result.get('message', '')
            }
            self.save_node_state(current_node.get('id'), node_state)
            
            # Amaç tamamlanma kontrolü ve otomatik geçiş
            if result.get('purpose_completed', False):
                # Amaç tamamlandı, bir sonraki node'a geç ve hemen yürüt
                if result.get('next_node'):
                    self.state.current_node_id = result['next_node'].get('id')
                    self.state.visited_nodes.append(current_node.get('id'))
                    logger.info(f"Purpose completed, moving to next node: {result['next_node'].get('id')}")
                    next_node = self.get_node_by_id(self.flow_data, self.state.current_node_id)
                    if next_node:
                        next_result = await self.execute_node(next_node, "", training_context)
                        return next_result
                else:
                    # Bağlı node yoksa, flow'u sonlandır
                    logger.info("Purpose completed but no next node found")
            elif result.get('waiting_for_response', False) and not user_message:
                # Kullanıcı yanıtı bekleniyor ve kullanıcı mesajı yok - node'da kal
                logger.info("Waiting for user response")
            elif user_message and current_node.get('type') == NodeType.START.value:
                # Start node'da kullanıcı mesajı geldiğinde, bağlı node'a geç
                connected_nodes = self.get_connected_nodes(self.flow_data, current_node.get('id'))
                if connected_nodes:
                    # Kullanıcı mesajına göre uygun node'u seç
                    user_message_lower = user_message.lower()
                    next_node = None
                    
                    # Özel anahtar kelimeleri kontrol et
                    if any(word in user_message_lower for word in ['başla', 'start', 'hazır', 'ready', 'devam', 'ok', 'tamam']):
                        # İlk bağlı node'a geç (genellikle prompt node)
                        next_node = connected_nodes[0]['node']
                    else:
                        # Varsayılan olarak ilk node'a geç
                        next_node = connected_nodes[0]['node']
                    
                    if next_node:
                        self.state.current_node_id = next_node.get('id')
                        self.state.visited_nodes.append(current_node.get('id'))
                        logger.info(f"User responded to start node, moving to: {next_node.get('id')}")
                        
                        # Yeni node'u yürüt - kullanıcı mesajını geçir
                        new_result = await self.execute_node(next_node, user_message, training_context)
                        return new_result
            elif not user_message and current_node.get('type') == NodeType.START.value:
                # Start node'da kullanıcı mesajı yoksa, otomatik olarak bağlı node'a geç
                connected_nodes = self.get_connected_nodes(self.flow_data, current_node.get('id'))
                if connected_nodes:
                    next_node = connected_nodes[0]['node']
                    self.state.current_node_id = next_node.get('id')
                    self.state.visited_nodes.append(current_node.get('id'))
                    logger.info(f"Auto-progressing from start node to: {next_node.get('id')}")
                    
                    # Yeni node'u yürüt - kullanıcı mesajı olmadan
                    new_result = await self.execute_node(next_node, "", training_context)
                    return new_result
            elif user_message and result.get('waiting_for_response', False):
                # Kullanıcı mesajı geldi ve waiting_for_response true ise, node'u tekrar yürüt
                logger.info(f"User message received while waiting for response: {user_message}")
                # Node'u tekrar yürüt - bu sefer kullanıcı mesajı ile
                new_result = await self.execute_node(current_node, user_message, training_context)
                return new_result
            elif not user_message and result.get('next_node') and not result.get('waiting_for_response', False):
                # Kullanıcı mesajı yoksa, next_node varsa ve yanıt beklenmiyorsa, otomatik geç ve yürüt
                self.state.current_node_id = result['next_node'].get('id')
                self.state.visited_nodes.append(current_node.get('id'))
                logger.info(f"Auto-progressing to next node: {result['next_node'].get('id')}")
                next_node = self.get_node_by_id(self.flow_data, self.state.current_node_id)
                if next_node:
                    next_result = await self.execute_node(next_node, "", training_context)
                    return next_result
            
            return result
            
        except Exception as e:
            logger.error(f"Flow execution error: {e}")
            return {"error": f"Flow yürütme hatası: {str(e)}"}
    
    async def execute_tool_call(self, tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
        """LLM araç çağrılarını yürüt"""
        try:
            if tool_name == "show_content":
                return {
                    "action": "show_content",
                    "content_id": tool_args.get("content_id"),
                    "message": tool_args.get("message", "İçerik gösteriliyor...")
                }
            elif tool_name == "translate_content":
                return {
                    "action": "translate_content",
                    "target_language": tool_args.get("target_language"),
                    "content_type": tool_args.get("content_type"),
                    "message": f"İçerik {tool_args.get('target_language')} diline çevriliyor..."
                }
            elif tool_name == "regenerate_content":
                return {
                    "action": "regenerate_content",
                    "content_type": tool_args.get("content_type"),
                    "style": tool_args.get("style"),
                    "message": f"İçerik yeniden oluşturuluyor (stil: {tool_args.get('style', 'default')})..."
                }
            elif tool_name == "jump_to_time":
                return {
                    "action": "jump_to_time",
                    "time_seconds": tool_args.get("time_seconds"),
                    "message": tool_args.get("message", f"{tool_args.get('time_seconds')}. saniyeye geçiliyor...")
                }
            elif tool_name == "show_overlay_list":
                return {
                    "action": "show_overlay_list",
                    "message": tool_args.get("message", "Overlay listesi gösteriliyor...")
                }
            elif tool_name == "control_video":
                action = tool_args.get("action")
                video_action_map = {
                    "play": "play_video",
                    "pause": "pause_video", 
                    "stop": "stop_video",
                    "restart": "restart_video"
                }
                return {
                    "action": video_action_map.get(action, "play_video"),
                    "message": tool_args.get("message", f"Video {action} yapılıyor...")
                }
            elif tool_name == "navigate_to_node":
                target_node_id = tool_args.get("target_node_id")
                reason = tool_args.get("reason", "")
                return_after = tool_args.get("return_after", False)
                
                return {
                    "action": "navigate_to_node",
                    "target_node_id": target_node_id,
                    "reason": reason,
                    "return_after": return_after,
                    "message": f"Node'a geçiliyor: {reason}"
                }
            elif tool_name == "return_to_section":
                message = tool_args.get("message", "Section'a geri döndünüz.")
                
                return {
                    "action": "return_to_section",
                    "message": message
                }
            else:
                return {
                    "action": "respond",
                    "message": f"Bilinmeyen araç: {tool_name}"
                }
        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            return {
                "action": "respond",
                "message": f"Araç yürütme hatası: {str(e)}"
            }

    def reset_state(self):
        """Flow state'ini sıfırla"""
        self.state = FlowState()
    
    def save_node_state(self, node_id: str, state_data: Dict[str, Any]):
        """Node durumunu kaydet"""
        if node_id not in self.state.node_states:
            self.state.node_states[node_id] = {}
        self.state.node_states[node_id].update(state_data)
    
    def get_node_state(self, node_id: str) -> Dict[str, Any]:
        """Node durumunu al"""
        return self.state.node_states.get(node_id, {})
    
    def add_message_to_history(self, node_id: str, message: Dict[str, Any]):
        """Node'a mesaj geçmişine ekle"""
        if node_id not in self.state.message_history:
            self.state.message_history[node_id] = []
        self.state.message_history[node_id].append(message)
    
    def get_node_message_history(self, node_id: str) -> List[Dict[str, Any]]:
        """Node'un mesaj geçmişini al"""
        return self.state.message_history.get(node_id, [])
    
    def add_section_interaction(self, section_id: str, interaction: Dict[str, Any]):
        """Section içi etkileşim ekle"""
        if section_id not in self.state.section_interactions:
            self.state.section_interactions[section_id] = []
        self.state.section_interactions[section_id].append(interaction)
    
    def get_section_interactions(self, section_id: str) -> List[Dict[str, Any]]:
        """Section etkileşimlerini al"""
        return self.state.section_interactions.get(section_id, [])
    
    def push_return_stack(self, node_id: str):
        """Geri dönüş yığınına node ekle"""
        self.state.return_stack.append(node_id)
    
    def pop_return_stack(self) -> Optional[str]:
        """Geri dönüş yığınından node al"""
        return self.state.return_stack.pop() if self.state.return_stack else None
    
    def set_temp_node(self, node_id: str):
        """Geçici node ayarla"""
        self.state.temp_node_id = node_id
    
    def clear_temp_node(self):
        """Geçici node'u temizle"""
        self.state.temp_node_id = None
