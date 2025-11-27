import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getEfficiencyAnalysis, triggerEfficiencyAnalysis } from '../services/api'
import { Line, Bar, Radar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
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
  BarElement,
  RadialLinearScale,
  ArcElement,
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
  const [pollingAttempts, setPollingAttempts] = useState(0)
  const MAX_POLLING_ATTEMPTS = 60  // 3초 * 60 = 3분

  useEffect(() => {
    loadAnalysis()

    // 컴포넌트 언마운트 시 폴링 정리
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [fileId])

  // 전체 회의 통합 지표 계산
  const calculateOverallMetrics = (speakerMetrics, analysisData) => {
    if (!speakerMetrics || speakerMetrics.length === 0) return null

    // 발화 빈도 통합
    const totalTurnCount = speakerMetrics.reduce((sum, s) => sum + (s.turn_frequency?.turn_count || 0), 0)
    const totalDuration = speakerMetrics.reduce((sum, s) => sum + (s.turn_frequency?.total_duration || 0), 0)

    // 백엔드의 전체 회의 지표 사용 (인사이트 포함)
    return {
      speaker_label: 'OVERALL',
      speaker_name: '전체 회의',
      turn_frequency: {
        turn_count: totalTurnCount,
        total_duration: totalDuration,
        avg_turn_length: totalTurnCount > 0 ? totalDuration / totalTurnCount : 0
      },
      // 백엔드에서 계산한 전체 회의 지표 사용 (AI 인사이트 포함)
      ttr: analysisData?.overall_ttr || {
        ttr_avg: 0,
        ttr_std: 0,
        ttr_values: []
      },
      information_content: analysisData?.overall_information_content || {
        avg_similarity: 0,
        information_score: 0
      },
      sentence_probability: analysisData?.overall_sentence_probability || {
        avg_probability: 0,
        outlier_ratio: 0
      },
      perplexity: analysisData?.overall_perplexity || {
        ppl_avg: 0,
        ppl_std: 0,
        ppl_values: []
      }
    }
  }

  const loadAnalysis = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getEfficiencyAnalysis(fileId)
      setAnalysis(data)
      if (data.speaker_metrics && data.speaker_metrics.length > 0) {
        // 전체 회의 통합 지표를 기본으로 선택
        const overall = calculateOverallMetrics(data.speaker_metrics, data)
        setSelectedSpeaker(overall)
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
        // 최대 시도 횟수 초과 시 에러 표시
        if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
          setError('timeout')
          setIsAnalyzing(false)
          if (pollingInterval) {
            clearInterval(pollingInterval)
            setPollingInterval(null)
          }
        } else {
          // 404일 경우 분석 중으로 간주하고 폴링 시작
          setIsAnalyzing(true)
          setPollingAttempts(prev => prev + 1)
          if (!pollingInterval) {
            const interval = setInterval(() => {
              loadAnalysis()
            }, 3000) // 3초마다 재시도
            setPollingInterval(interval)
          }
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

      {/* 전체 회의 엔트로피 차트 */}
      {analysis?.entropy?.values && analysis.entropy.values.length > 0 && (
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-green-500 pb-2">
            담화 엔트로피 (Entropy)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            높은 엔트로피 = 다양한 주제, 낮은 엔트로피 = 집중된 논의
          </p>
          <div style={{ height: '400px' }}>
            <Line
              data={{
                labels: analysis.entropy.values.map((_, i) => i + 1),
                datasets: [
                  {
                    label: 'Original Entropy',
                    data: analysis.entropy.values.map(v => v.entropy),
                    borderColor: 'rgba(75, 192, 192, 0.3)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 1,
                    pointRadius: 0
                  },
                  {
                    label: 'Moving Avg (10)',
                    data: analysis.entropy.values.map((v, i, arr) => {
                      const start = Math.max(0, i - 5)
                      const end = Math.min(arr.length, i + 5)
                      const slice = arr.slice(start, end).map(item => item.entropy)
                      return slice.reduce((a, b) => a + b, 0) / slice.length
                    }),
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                  },
                  {
                    label: 'Moving Avg (30)',
                    data: analysis.entropy.values.map((v, i, arr) => {
                      const start = Math.max(0, i - 15)
                      const end = Math.min(arr.length, i + 15)
                      const slice = arr.slice(start, end).map(item => item.entropy)
                      return slice.reduce((a, b) => a + b, 0) / slice.length
                    }),
                    borderColor: 'rgb(0, 128, 128)',
                    borderWidth: 2.5,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                    labels: { color: 'rgb(156, 163, 175)', font: { size: 11 } }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: false,
                    title: {
                      display: true,
                      text: 'Entropy (bits)',
                      color: 'rgb(156, 163, 175)',
                      font: { weight: 'bold' }
                    },
                    ticks: { color: 'rgb(156, 163, 175)' },
                    grid: { color: 'rgba(156, 163, 175, 0.1)' }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Window Index',
                      color: 'rgb(156, 163, 175)',
                      font: { weight: 'bold' }
                    },
                    ticks: { color: 'rgb(156, 163, 175)' },
                    grid: { color: 'rgba(156, 163, 175, 0.1)' }
                  }
                }
              }}
            />
          </div>
          {analysis.entropy.insight && (
            <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">AI 분석 결과</p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {analysis.entropy.insight}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 화자별 분석 */}
      <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          화자별 효율성 지표
        </h2>

        {/* 화자 선택 탭 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {/* 전체 회의 버튼 */}
          <button
            onClick={() => setSelectedSpeaker(calculateOverallMetrics(analysis?.speaker_metrics, analysis))}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              selectedSpeaker?.speaker_label === 'OVERALL'
                ? 'bg-accent-blue text-white'
                : 'bg-bg-secondary dark:bg-bg-secondary-dark text-gray-700 dark:text-gray-300 hover:bg-bg-accent/20'
            }`}
          >
            📊 전체 회의
          </button>

          {/* 개별 화자 버튼 */}
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
          <div className="space-y-8">
            {/* 1. Share of Voice - 발화 점유율 */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-accent-blue pb-2">
                1. 발화 점유율 (Share of Voice)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 시간 기반 도넛 차트 */}
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                    시간 기반
                  </h3>
                  <div style={{ height: '300px' }} className="flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: analysis?.speaker_metrics?.map(s => s.speaker_name) || [],
                        datasets: [{
                          label: '발화 시간 (%)',
                          data: analysis?.speaker_metrics?.map(s => s.turn_frequency?.total_duration || 0) || [],
                          backgroundColor: [
                            'rgba(99, 102, 241, 0.7)',
                            'rgba(236, 72, 153, 0.7)',
                            'rgba(34, 197, 94, 0.7)',
                            'rgba(251, 146, 60, 0.7)',
                            'rgba(168, 85, 247, 0.7)',
                          ],
                          borderColor: [
                            'rgb(99, 102, 241)',
                            'rgb(236, 72, 153)',
                            'rgb(34, 197, 94)',
                            'rgb(251, 146, 60)',
                            'rgb(168, 85, 247)',
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: {
                              color: 'rgb(156, 163, 175)',
                              font: { size: 12 },
                              padding: 15,
                              generateLabels: (chart) => {
                                const data = chart.data
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
                                return data.labels.map((label, i) => {
                                  const value = data.datasets[0].data[i]
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                                  return {
                                    text: `${label}: ${percentage}%`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                  }
                                })
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed
                                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                                const percentage = ((value / total) * 100).toFixed(1)
                                return `${context.label}: ${value.toFixed(1)}초 (${percentage}%)`
                              }
                            }
                          }
                        },
                        cutout: '50%'
                      }}
                    />
                  </div>
                </div>

                {/* 토큰 기반 도넛 차트 */}
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                    토큰 기반 (발화 횟수)
                  </h3>
                  <div style={{ height: '300px' }} className="flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: analysis?.speaker_metrics?.map(s => s.speaker_name) || [],
                        datasets: [{
                          label: '발화 횟수 (%)',
                          data: analysis?.speaker_metrics?.map(s => s.turn_frequency?.turn_count || 0) || [],
                          backgroundColor: [
                            'rgba(99, 102, 241, 0.7)',
                            'rgba(236, 72, 153, 0.7)',
                            'rgba(34, 197, 94, 0.7)',
                            'rgba(251, 146, 60, 0.7)',
                            'rgba(168, 85, 247, 0.7)',
                          ],
                          borderColor: [
                            'rgb(99, 102, 241)',
                            'rgb(236, 72, 153)',
                            'rgb(34, 197, 94)',
                            'rgb(251, 146, 60)',
                            'rgb(168, 85, 247)',
                          ],
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'right',
                            labels: {
                              color: 'rgb(156, 163, 175)',
                              font: { size: 12 },
                              padding: 15,
                              generateLabels: (chart) => {
                                const data = chart.data
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0)
                                return data.labels.map((label, i) => {
                                  const value = data.datasets[0].data[i]
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                                  return {
                                    text: `${label}: ${percentage}%`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                  }
                                })
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed
                                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                                const percentage = ((value / total) * 100).toFixed(1)
                                return `${context.label}: ${value}회 (${percentage}%)`
                              }
                            }
                          }
                        },
                        cutout: '50%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 발화 빈도 */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-accent-teal pb-2">
                2. 발화 빈도 (Turn-Taking Frequency)
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">발화 횟수</p>
                  <p className="text-4xl font-bold text-accent-blue dark:text-accent-teal">
                    {selectedSpeaker.turn_frequency?.turn_count || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">회</p>
                </div>
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">총 발화 시간</p>
                  <p className="text-4xl font-bold text-accent-sage dark:text-accent-sage">
                    {selectedSpeaker.turn_frequency?.total_duration?.toFixed(1) || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">초</p>
                </div>
                <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">평균 발화 길이</p>
                  <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedSpeaker.turn_frequency?.avg_turn_length?.toFixed(1) || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">초/회</p>
                </div>
              </div>
            </div>

            {/* 3. TTR */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-orange-500 pb-2">
                3. TTR (Type-Token Ratio)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                고유 단어 수 / 전체 단어 수. 높을수록 어휘가 다양합니다.
              </p>
              <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">평균 TTR</p>
                    <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                      {selectedSpeaker.ttr?.ttr_avg?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">표준편차</p>
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                      {selectedSpeaker.ttr?.ttr_std?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedSpeaker.ttr?.ttr_values && selectedSpeaker.ttr.ttr_values.length > 0 && (
                  <div style={{ height: '350px' }}>
                    <Line
                      data={{
                        labels: selectedSpeaker.ttr.ttr_values.map((_, i) => i + 1),
                        datasets: [
                          {
                            label: 'Original TTR',
                            data: selectedSpeaker.ttr.ttr_values,
                            borderColor: 'rgba(255, 159, 64, 0.3)',
                            backgroundColor: 'rgba(255, 159, 64, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 1,
                            pointRadius: 0
                          },
                          {
                            label: 'Moving Avg (10)',
                            data: selectedSpeaker.ttr.ttr_values.map((v, i, arr) => {
                              const start = Math.max(0, i - 5)
                              const end = Math.min(arr.length, i + 5)
                              const slice = arr.slice(start, end)
                              return slice.reduce((a, b) => a + b, 0) / slice.length
                            }),
                            borderColor: 'rgb(255, 159, 64)',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 0
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: { color: 'rgb(156, 163, 175)', font: { size: 11 } }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 1,
                            title: {
                              display: true,
                              text: 'TTR (Type-Token Ratio)',
                              color: 'rgb(156, 163, 175)',
                              font: { weight: 'bold' }
                            },
                            ticks: { color: 'rgb(156, 163, 175)' },
                            grid: { color: 'rgba(156, 163, 175, 0.1)' }
                          },
                          x: {
                            title: {
                              display: true,
                              text: 'Segment Index',
                              color: 'rgb(156, 163, 175)',
                              font: { weight: 'bold' }
                            },
                            ticks: { color: 'rgb(156, 163, 175)' },
                            grid: { color: 'rgba(156, 163, 175, 0.1)' }
                          }
                        }
                      }}
                    />
                  </div>
                )}
                {selectedSpeaker.ttr?.insight && (
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">AI 분석 결과</p>
                        <p className="text-sm text-orange-800 dark:text-orange-200">
                          {selectedSpeaker.ttr.insight}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. 정보량 */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-purple-500 pb-2">
                4. 정보량 (Information Content)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                낮은 유사도 = 높은 정보량, 높은 유사도 = 반복적인 내용
              </p>
              <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">평균 유사도</p>
                    <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                      {selectedSpeaker.information_content?.avg_similarity?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">정보 점수</p>
                    <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                      {selectedSpeaker.information_content?.information_score?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                </div>
                {selectedSpeaker.information_content?.insight && (
                  <div className="bg-gradient-to-r from-purple-50 to-yellow-50 dark:from-purple-900/20 dark:to-yellow-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">AI 분석 결과</p>
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          {selectedSpeaker.information_content.insight}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. 문장 확률 */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-teal-500 pb-2">
                5. 문장 확률 (Sentence Probability)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                낮은 확률 = 비정상적 패턴, 높은 이상치 비율 = 예측 불가능
              </p>
              <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">평균 확률</p>
                    <p className="text-4xl font-bold text-teal-600 dark:text-teal-400">
                      {selectedSpeaker.sentence_probability?.avg_probability?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">이상치 비율</p>
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                      {selectedSpeaker.sentence_probability?.outlier_ratio?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                </div>
                {selectedSpeaker.sentence_probability?.insight && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-teal-900 dark:text-teal-100 mb-1">AI 분석 결과</p>
                        <p className="text-sm text-teal-800 dark:text-teal-200">
                          {selectedSpeaker.sentence_probability.insight}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. PPL (Perplexity) */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 border-b-2 border-red-500 pb-2">
                6. Perplexity (PPL)
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                낮은 PPL = 유창한 흐름, 높은 PPL = 주제 전환 또는 예측 불가능
              </p>
              <div className="bg-bg-secondary dark:bg-bg-secondary-dark rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">평균 PPL</p>
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                      {selectedSpeaker.perplexity?.ppl_avg?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">표준편차</p>
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedSpeaker.perplexity?.ppl_std?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedSpeaker.perplexity?.ppl_values && selectedSpeaker.perplexity.ppl_values.length > 0 && (
                  <div style={{ height: '350px' }}>
                    <Line
                      data={{
                        labels: selectedSpeaker.perplexity.ppl_values.map((v, i) => i + 1),
                        datasets: [
                          {
                            label: 'Original PPL',
                            data: selectedSpeaker.perplexity.ppl_values.map(v => v.ppl),
                            borderColor: 'rgba(255, 99, 132, 0.3)',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 1,
                            pointRadius: 0
                          },
                          {
                            label: 'Moving Avg (5)',
                            data: selectedSpeaker.perplexity.ppl_values.map((v, i, arr) => {
                              const start = Math.max(0, i - 2)
                              const end = Math.min(arr.length, i + 3)
                              const slice = arr.slice(start, end).map(item => item.ppl)
                              return slice.reduce((a, b) => a + b, 0) / slice.length
                            }),
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 2.5,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 0
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: { color: 'rgb(156, 163, 175)', font: { size: 11 } }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: 'Perplexity (PPL)',
                              color: 'rgb(156, 163, 175)',
                              font: { weight: 'bold' }
                            },
                            ticks: { color: 'rgb(156, 163, 175)' },
                            grid: { color: 'rgba(156, 163, 175, 0.1)' }
                          },
                          x: {
                            title: {
                              display: true,
                              text: 'Segment Index',
                              color: 'rgb(156, 163, 175)',
                              font: { weight: 'bold' }
                            },
                            ticks: { color: 'rgb(156, 163, 175)' },
                            grid: { color: 'rgba(156, 163, 175, 0.1)' }
                          }
                        }
                      }}
                    />
                  </div>
                )}
                {selectedSpeaker.perplexity?.insight && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">AI 분석 결과</p>
                        <p className="text-sm text-red-800 dark:text-red-200">
                          {selectedSpeaker.perplexity.insight}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
