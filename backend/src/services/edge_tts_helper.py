import sys
import json
import asyncio
import edge_tts
import os

async def main():
    # 1. Handle --list-voices command
    if len(sys.argv) > 1 and sys.argv[1] == "--list-voices":
        try:
            voices = await edge_tts.list_voices()
            print(json.dumps(voices))
            sys.exit(0)
        except Exception as e:
            print(f"ERROR: {str(e)}")
            sys.exit(1)

    if len(sys.argv) < 5:
        print("Usage: python edge_tts_helper.py <text> <voice> <output_mp3> <output_json> [rate] [pitch] [volume]")
        sys.exit(1)
        
    text = sys.argv[1]
    voice = sys.argv[2]
    output_mp3 = sys.argv[3]
    output_json = sys.argv[4]
    
    rate = sys.argv[5] if len(sys.argv) > 5 else "+5%"
    pitch = sys.argv[6] if len(sys.argv) > 6 else "+0Hz"
    volume = sys.argv[7] if len(sys.argv) > 7 else "+0%"
    
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
        
        # Use the official save method to generate audio and write metadata
        # edge-tts save() writes JSON lines containing WordBoundary and SentenceBoundary events
        temp_meta_path = output_json + ".tmp"
        await communicate.save(output_mp3, temp_meta_path)
        
        word_boundaries = []
        if os.path.exists(temp_meta_path):
            with open(temp_meta_path, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        item = json.loads(line)
                        if item.get("type") == "WordBoundary":
                            word_boundaries.append({
                                "offset": item.get("offset"),
                                "duration": item.get("duration"),
                                "text": item.get("text")
                            })
                    except Exception as pe:
                        print("Parse line error:", pe)
            
            # Clean up temp metadata file
            try:
                os.unlink(temp_meta_path)
            except:
                pass
                
        # Write clean timing JSON array
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(word_boundaries, f, ensure_ascii=False, indent=2)
            
        print("SUCCESS")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
