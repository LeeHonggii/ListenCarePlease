"""
임베딩이 포함된 결과를 export하는 스크립트
"""
import requests
import json
from pathlib import Path

file_id = "8e6f389b-45dc-4cb3-b30c-d656b5e0bbe7"
api_url = f"http://localhost:8000/api/v1/process/export/{file_id}"

try:
    print(f"API 호출 중: {api_url}")
    response = requests.get(api_url)
    response.raise_for_status()
    
    result = response.json()
    print(f"✅ 성공: {result.get('message')}")
    print(f"   파일 경로: {result.get('file_path')}")
    print(f"   세그먼트 수: {result.get('total_segments')}")
    
    # 생성된 파일 확인
    file_path = result.get('file_path')
    if file_path and Path(file_path).exists():
        print(f"\n📄 생성된 파일 확인 중...")
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 임베딩 확인
        if 'speaker_info' in data and 'embeddings' in data['speaker_info']:
            embeddings = data['speaker_info']['embeddings']
            print(f"✅ 임베딩 포함됨: {len(embeddings)}개 화자")
            for speaker, embedding in embeddings.items():
                if embedding:
                    print(f"   - {speaker}: {len(embedding)}차원 벡터")
                else:
                    print(f"   - {speaker}: None")
        else:
            print("❌ 임베딩이 포함되지 않았습니다.")
            
except requests.exceptions.ConnectionError:
    print("❌ 백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.")
except Exception as e:
    print(f"❌ 오류 발생: {e}")















