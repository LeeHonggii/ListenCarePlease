# Sepeaker Diarization ?
주어진 음성파일에서, 화자별 발언 시간을 계산하는 작업  
전통적인 화자 구분은 다음과 같이 동작함   
1. 음성 감지
2. 음성 존재 구간 별 세그먼트 얻기   
3. 세그먼트별 오디오 임베딩 벡터 값을 얻음   
4. 얻은 값 각각 비교하며 유사군집별 클러스터링
5. 후처리 후 화자 구분 결과값 반환   
[speaker diarization 연구일지](https://cori.tistory.com/393)
**google/DiarizationLM-13b-Fisher-v1**   텍스트를 입력으로 화자구분을 수행하는 구글의 모델
![diagram of diarizationlm](https://img1.daumcdn.net/thumb/R960x0/?scode=mtistory2&fname=https%3A%2F%2Fblog.kakaocdn.net%2Fdna%2Fzdn8V%2FbtsMRforxNR%2FAAAAAAAAAAAAAAAAAAAAAAEwsSA_jUOAXC65YOH9TpjCDFkB0ei1kNNRw7oMbgSd%2Fimg.png%3Fcredential%3DyqXZFxpELC7KVnFOS48ylbz2pIh7yKj8%26expires%3D1764514799%26allow_ip%3D%26allow_referer%3D%26signature%3DdgqXI60aBhYKxl0ShD8jc27zRyQ%253D)

**num of channel**   
채널의 개수 = 마이크의 개수

[diarization_sota_1](https://www.reddit.com/r/LocalLLaMA/comments/1i8zpvi/transcription_with_diarization_whats_local_sota/?tl=ko)   
[diarization_sota_2](https://www.reddit.com/r/LocalLLaMA/comments/1i3px18/current_sota_for_local_speech_to_text_diarization/)   
[hf_pyanote](https://huggingface.co/pyannote/speaker-diarization-community-1)