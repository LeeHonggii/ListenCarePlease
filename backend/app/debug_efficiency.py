import sys
import os
import logging

# Add /app to sys.path to ensure we can import app
sys.path.append("/app")

from app.db.base import SessionLocal
from app.models.audio_file import AudioFile
from app.services.efficiency_analyzer import EfficiencyAnalyzer

# Configure logging to write to file
logging.basicConfig(
    filename='/app/uploads/debug_log.txt',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    print("Starting debug script...")
    with open('/app/uploads/debug_log.txt', 'w') as f:
        f.write("Starting debug script...\n")

    db = SessionLocal()
    try:
        # Get latest audio file
        audio_file = db.query(AudioFile).order_by(AudioFile.id.desc()).first()
        if not audio_file:
            msg = "No audio files found."
            print(msg)
            with open('/app/uploads/debug_log.txt', 'a') as f:
                f.write(msg + "\n")
            return

        msg = f"Found audio file: {audio_file.id} ({audio_file.original_filename})"
        print(msg)
        with open('/app/uploads/debug_log.txt', 'a') as f:
            f.write(msg + "\n")

        # Run analysis
        analyzer = EfficiencyAnalyzer(audio_file.id, db)
        analysis = analyzer.analyze_all()
        
        msg = "Analysis completed successfully."
        print(msg)
        with open('/app/uploads/debug_log.txt', 'a') as f:
            f.write(msg + "\n")
            
    except Exception as e:
        msg = f"Error: {e}"
        print(msg)
        import traceback
        traceback_str = traceback.format_exc()
        print(traceback_str)
        with open('/app/uploads/debug_log.txt', 'a') as f:
            f.write(msg + "\n")
            f.write(traceback_str + "\n")
    finally:
        db.close()

if __name__ == "__main__":
    main()
