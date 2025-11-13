import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function TaggingAnalyzingPage() {
  const { fileId } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    // Mock: LLM 분석 시뮬레이션 (3초)
    const timer = setTimeout(() => {
      navigate(`/tagging/${fileId}`)
    }, 3000)

    return () => clearTimeout(timer)
  }, [fileId, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 transition-colors duration-300 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12">
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
              🤖 AI가 화자를 분석하고 있습니다
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              멀티턴 LLM으로 이름과 역할을 추론 중...
            </p>
          </div>

          {/* 분석 단계 */}
          <div className="space-y-3">
            {[
              { label: '대화 문맥 추출 중', emoji: '📝' },
              { label: '이름 감지 및 매칭', emoji: '👤' },
              { label: '발화 패턴 분석', emoji: '🗣️' },
              { label: '역할 추론', emoji: '👔' },
              { label: '신뢰도 계산', emoji: '📊' },
            ].map((step, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg animate-pulse"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <span className="text-2xl">{step.emoji}</span>
                <span className="text-gray-700 font-medium">{step.label}</span>
                <div className="ml-auto">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              </div>
            ))}
          </div>

          {/* 안내 메시지 */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              💡 잠시만 기다려주세요. I,O.md의 멀티턴 LLM 분석이 진행됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
