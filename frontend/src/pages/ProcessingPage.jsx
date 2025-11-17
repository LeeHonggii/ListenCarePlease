import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { startProcessing, getProcessingStatus } from '../services/api';

const ProcessingPage = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('처리 시작 중...');
  const [error, setError] = useState(null);

  // 네비게이션 state에서 모드 정보 가져오기
  const whisperMode = location.state?.whisperMode || 'local';
  const diarizationMode = location.state?.diarizationMode || 'senko';

  useEffect(() => {
    let pollingInterval = null;

    const initiateProcessing = async () => {
      try {
        // 백엔드 처리 시작
        await startProcessing(fileId, whisperMode, diarizationMode);

        // 상태 폴링 시작 (2초마다)
        pollingInterval = setInterval(async () => {
          try {
            const status = await getProcessingStatus(fileId);

            // 상태에 따라 진행률 및 메시지 업데이트
            if (status.status === 'preprocessing') {
              setProgress(30);
              setCurrentStep('음성 전처리 중...');
            } else if (status.status === 'stt') {
              setProgress(50);
              setCurrentStep('STT 분석 중...');
            } else if (status.status === 'diarization') {
              setProgress(75);
              setCurrentStep('화자 분리 중...');
            } else if (status.status === 'saving') {
              setProgress(90);
              setCurrentStep('결과 저장 중...');
            } else if (status.status === 'completed') {
              setProgress(100);
              setCurrentStep('완료!');
              clearInterval(pollingInterval);

              // 완료 후 화자 정보 확인 페이지로 이동
              setTimeout(() => {
                navigate(`/confirm/${fileId}`);
              }, 1000);
            } else if (status.status === 'failed') {
              setError(status.error || '처리 중 오류가 발생했습니다.');
              clearInterval(pollingInterval);
            }
          } catch (err) {
            console.error('Status polling error:', err);
            // 폴링 에러는 무시하고 계속 진행
          }
        }, 2000);

      } catch (err) {
        console.error('Processing error:', err);
        setError(err.response?.data?.detail || '파일 처리 중 오류가 발생했습니다.');
      }
    };

    initiateProcessing();

    // 컴포넌트 언마운트 시 폴링 중지
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [fileId, navigate, whisperMode, diarizationMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center px-4 transition-colors duration-300">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 border-2 border-gray-200 dark:border-gray-700 shadow-2xl">
          {/* 애니메이션 아이콘 */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
          </div>

          {/* 상태 텍스트 */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              파일 분석 중...
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {currentStep}
            </p>
          </div>

          {/* 선택된 모델 정보 */}
          <div className="mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">🎙️ 화자 분리:</span>
                <span className="ml-2 text-indigo-800 dark:text-indigo-200">
                  {diarizationMode === 'senko' ? 'Senko (빠름)' : 'NeMo (정확)'}
                </span>
              </div>
              <div>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">📝 음성 인식:</span>
                <span className="ml-2 text-indigo-800 dark:text-indigo-200">
                  {whisperMode === 'local' ? 'Local Whisper' : 'OpenAI API'}
                </span>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 진행률 바 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>진행률</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 처리 단계 */}
          <div className="space-y-3">
            {[
              { label: '음성 전처리', done: progress >= 30 },
              { label: 'STT 분석', done: progress >= 50 },
              { label: '화자 분리', done: progress >= 75 },
              { label: '결과 저장', done: progress >= 90 },
              { label: '완료', done: progress >= 100 },
            ].map((step, index) => (
              <div
                key={index}
                className={`flex items-center space-x-3 transition-all duration-300 ${
                  step.done ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step.done
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  {step.done && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-900 dark:text-white font-medium">{step.label}</span>
              </div>
            ))}
          </div>

          {/* 안내 메시지 */}
          <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <p className="text-indigo-700 dark:text-indigo-300 text-sm text-center">
              💡 처리가 완료되면 자동으로 다음 단계로 이동합니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingPage;
