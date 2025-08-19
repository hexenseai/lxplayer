# Frame Set Test Guide

## Test Setup

1. Start the backend:
```bash
cd apps/api
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. Start the frontend:
```bash
cd apps/web
npm run dev
```

3. Run the seed script to create test data:
```bash
cd apps/api
py scripts/seed_interactive.py
```

## Test Access

Navigate to: `http://localhost:3000/player/TEST123`

## Frame Set Test Timeline

### Section 1 (60 seconds)
- **0-15s**: Wide frame (default)
- **15s**: Frame changes to `face_left` (sol yüz)
- **30s**: Frame changes to `face_right` (sağ yüz)
- **45s**: Frame changes to `face_middle` (orta yüz)
- **55s**: Frame changes to `face_close` (yakın yüz)

### Section 2 (90 seconds)
- **0-25s**: Wide frame (default)
- **25s**: Frame changes to `face_left` (sol yüz)
- **40s**: Frame changes to `face_middle` (orta yüz)
- **60s**: Frame changes back to `wide` (geniş)

## Expected Behavior

1. **Visual Indicators**: 
   - Frame indicator in top-right corner shows current frame
   - Frame status indicator in top-left shows "Frame: [type]"
   - Transition indicator shows "Odaklanıyor..." during frame changes

2. **Zoom and Focus**:
   - `wide`: Normal view, no zoom
   - `face_left`: Zoomed in on left side (25% position, 1.4x scale)
   - `face_right`: Zoomed in on right side (75% position, 1.4x scale)
   - `face_middle`: Zoomed in on center (1.6x scale)
   - `face_close`: Maximum zoom on center (2.0x scale)

3. **Smooth Transitions**:
   - 0.8 second cubic-bezier transition between frames
   - Visual feedback during transitions

## Console Logs

Check browser console for:
- "Frame set overlay activated: [frame] at time: [time]"
- "Frame set overlay triggered: [frame]"
- "Overlay action: frame_set [frame]"
- "Setting frame to: [frame]"
- "InteractivePlayer: Current frame changed to: [frame]"
- "VideoFrame: Frame changed to: [frame]"

## Troubleshooting

If frame changes are not working:

1. Check console for errors
2. Verify overlay data in database
3. Ensure WebSocket connection is active
4. Check that `handleOverlayAction` is being called
5. Verify `setCurrentFrame` is updating state
6. Check that VideoFrame component receives frame prop

## Manual Testing

You can also test frame changes manually by:

1. Opening browser console
2. Running: `window.playerRef.current.setFrame('face_left')`
3. Or through AI commands: "frame değiştir" / "change frame"
