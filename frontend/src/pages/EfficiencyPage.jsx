import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getEfficiencyAnalysis, triggerEfficiencyAnalysis } from '../services/api'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function EfficiencyPage() {
  const { fileId } = useParams()
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedSpeaker, setSelectedSpeaker] = useState(null)
  const [error, setError] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)

  useEffect(() => {
    loadAnalysis()

    // 컴포넌트 언마운트 시 폴링 정리
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [fileId])

  const loadAnalysis = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getEfficiencyAnalysis(fileId)
      setAnalysis(data)
      if (data.speaker_metrics && data.speaker_metrics.length > 0) {
        setSelectedSpeaker(data.speaker_metrics[0])
      }
      // 분석 완료되면 폴링 중지
      if (pollingInterval) {
        clearInterval(pollingInterval)
        setPollingInterval(null)
      }
      setIsAnalyzing(false)
    } catch (error) {
      console.error('Failed to load efficiency analysis:', error)
      if (error.response?.status === 404) {
        // 404일 경우 분석 중으로 간주하고 폴링 시작
        setIsAnalyzing(true)
        if (!pollingInterval) {
          const interval = setInterval(() => {
            loadAnalysis()
          }, 3000) // 3초마다 재시도
          setPollingInterval(interval)
        }
      } else {
        setError('error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 분석 중이거나 초기 로딩 중
  if (isLoading || isAnalyzing) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-accent-blue mx-auto"></div>
          <p className="mt-6 text-xl font-medium text-gray-900 dark:text-white">
            효율성 분석 중입니다...
          </p>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isAnalyzing ? '분석이 완료될 때까지 기다려주세요 (자동 새로고침)' : '분석 결과 로딩 중...'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="animate-pulse w-2 h-2 bg-accent-blue rounded-full"></div>
            <div className="animate-pulse w-2 h-2 bg-accent-blue rounded-full" style={{animationDelay: '0.2s'}}></div>
            <div className="animate-pulse w-2 h-2 bg-accent-blue rounded-full" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              오류 발생
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              효율성 분석 결과를 불러오는데 실패했습니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 엔트로피 차트 데이터
  const entropyChartData = {
    labels: analysis?.entropy?.values?.map((_, i) => i) || [],
    datasets: [
      {
        label: '엔트로피',
        data: analysis?.entropy?.values?.map(v => v.entropy) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: 'rgb(156, 163, 175)'
        }
      }
    },
    scales: {
      y: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' }
      },
      x: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' }
      }
    }
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          회의 효율성 분석
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          회의의 전체 효율성 및 화자별 상세 지표를 확인하세요
        </p>
      </div>

      {/* 전체 회의 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            평균 엔트로피
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analysis?.entropy?.avg?.toFixed(2) || 'N/A'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            표준편차: {analysis?.entropy?.std?.toFixed(2) || 'N/A'}
          </p>
        </div>

        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            총 화자 수
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analysis?.total_speakers || 0}명
          </p>
        </div>

        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            총 발화 수
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analysis?.total_turns || 0}회
          </p>
        </div>
      </div>

      {/* 엔트로피 차트 */}
      {analysis?.entropy?.values && analysis.entropy.values.length > 0 && (
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            담화 엔트로피 추이
          </h2>
          <div style={{ height: '300px' }}>
            <Line data={entropyChartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* 화자별 분석 */}
      <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          화자별 효율성 지표
        </h2>

        {/* 화자 선택 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {analysis?.speaker_metrics?.map((speaker) => (
            <button
              key={speaker.speaker_label}
              onClick={() => setSelectedSpeaker(speaker)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedSpeaker?.speaker_label === speaker.speaker_label
                  ? 'bg-accent-sage dark:bg-accent-teal text-gray-900 dark:text-white'
                  : 'bg-bg-secondary dark:bg-bg-secondary-dark text-gray-700 dark:text-gray-300 hover:bg-bg-accent/20'
              }`}
            >
              {speaker.speaker_name}
            </button>
          ))}
        </div>

        {/* 선택된 화자의 지표 */}
        {selectedSpeaker && (
          <div className="space-y-6">
            {/* 발화 빈도 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                1. 발화 빈도
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">발화 횟수</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {selectedSpeaker.turn_frequency?.turn_count || 0}회
                  </p>
                </div>
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">총 발화 시간</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {selectedSpeaker.turn_frequency?.total_duration?.toFixed(1) || 0}초
                  </p>
                </div>
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">평균 발화 길이</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {selectedSpeaker.turn_frequency?.avg_turn_length?.toFixed(1) || 0}초
                  </p>
                </div>
              </div>
            </div>

            {/* TTR */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                2. TTR (Type-Token Ratio)
              </h3>
              <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">평균 TTR</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {selectedSpeaker.ttr?.ttr_avg?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">표준편차</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {selectedSpeaker.ttr?.ttr_std?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 정보량 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                3. 정보량 (Information Content)
              </h3>
              <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">평균 유사도</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {selectedSpeaker.information_content?.avg_similarity?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">정보 점수</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {selectedSpeaker.information_content?.information_score?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  * 낮은 유사도 = 높은 정보량
                </p>
              </div>
            </div>

            {/* Perplexity */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                4. Perplexity (PPL)
              </h3>
              <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">평균 PPL</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {selectedSpeaker.perplexity?.ppl_avg?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">표준편차</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {selectedSpeaker.perplexity?.ppl_std?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
