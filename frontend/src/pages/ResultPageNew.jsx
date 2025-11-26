import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function ResultPageNew() {
  const { fileId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchResult()
  }, [fileId])

  const fetchResult = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/tagging/${fileId}/result`)
      console.log('ResultPageNew - API response:', response.data)
      setData(response.data)

      // 통계 계산
      calculateStats(response.data)
      setLoading(false)
    } catch (error) {
      console.error('결과 조회 실패:', error)

      // 404 에러면 태깅이 완료되지 않은 것이므로 태깅 페이지로 리다이렉트
      if (error.response?.status === 404) {
        console.log('태깅이 완료되지 않았습니다. 태깅 페이지로 이동합니다.')
        navigate(`/tagging/${fileId}`)
      } else {
        setLoading(false)
      }
    }
  }

  const calculateStats = (resultData) => {
    const speakerStats = {}

    resultData.final_transcript.forEach((segment) => {
      // speaker_label을 키로 사용 (서로 다른 화자 구분)
      const speakerKey = segment.speaker_label
      const duration = segment.end_time - segment.start_time

      if (!speakerStats[speakerKey]) {
        speakerStats[speakerKey] = {
          name: segment.speaker_name,  // 표시용 이름
          label: segment.speaker_label,  // 구분용 라벨
          count: 0,
          totalDuration: 0
        }
      }

      speakerStats[speakerKey].count += 1
      speakerStats[speakerKey].totalDuration += duration
    })

    setStats(speakerStats)
  }

  const handleDownload = () => {
    if (!data) return

    const text = data.final_transcript
      .map(seg => `[${formatTime(seg.start_time)} - ${formatTime(seg.end_time)}] ${seg.speaker_name}:\n${seg.text}\n`)
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `회의록_${fileId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}분 ${secs}초`
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent-blue"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              회의록 결과
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              화자별 발화 통계와 전체 회의록을 확인하세요
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/efficiency/${fileId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-bg-tertiary dark:bg-bg-tertiary-dark hover:bg-bg-accent/20 text-gray-900 dark:text-white rounded-lg font-medium transition-all border border-bg-accent/30"
            >
              <span>🎯</span>
              효율성 분석
            </button>
            <button
              onClick={() => navigate(`/tagging/${fileId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-sage dark:bg-accent-teal hover:opacity-90 text-gray-900 dark:text-white rounded-lg font-medium transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              수정하기
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats && Object.entries(stats).map(([speakerLabel, stat], index) => (
            <div key={speakerLabel} className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl shadow-lg p-6 border-2 border-bg-accent/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{stat.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
                </div>
                <div className="w-10 h-10 bg-accent-blue rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {index + 1}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">🗣️ 발화 횟수</span>
                  <span className="text-2xl font-bold text-accent-blue">{stat.count}회</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">⏱️ 발화 시간</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatDuration(stat.totalDuration)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 전체 회의록 */}
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📝 전체 회의록</h2>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-bg-secondary dark:bg-bg-secondary-dark hover:bg-bg-accent/20 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              다운로드
            </button>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {data?.final_transcript.map((segment, index) => (
              <div
                key={index}
                className="p-4 bg-bg-secondary dark:bg-bg-secondary-dark hover:bg-bg-accent/20 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-accent-blue dark:text-blue-300">{segment.speaker_name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{segment.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 추가 기능 */}
        <div className="bg-bg-tertiary dark:bg-bg-tertiary-dark rounded-xl p-6 border border-bg-accent/30">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            추가 기능
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* RAG */}
            <button
              onClick={() => navigate(`/rag/${data?.audio_file_id || fileId}`, { state: { resultFileId: fileId } })}
              className="flex items-center gap-3 p-4 bg-accent-sage dark:bg-accent-teal hover:opacity-90 text-gray-900 dark:text-white rounded-lg font-medium transition-all"
            >
              <span className="text-2xl">💬</span>
              <span>RAG</span>
            </button>

            {/* 효율성 평가 */}
            <button
              onClick={() => navigate(`/efficiency/${fileId}`)}
              className="flex items-center gap-3 p-4 bg-accent-sage dark:bg-accent-teal hover:opacity-90 text-gray-900 dark:text-white rounded-lg font-medium transition-all"
            >
              <span className="text-2xl">📊</span>
              <span>효율성 평가</span>
            </button>

            {/* TODO */}
            <button
              onClick={() => navigate(`/todo/${data?.audio_file_id || fileId}`)}
              className="flex items-center gap-3 p-4 bg-accent-sage dark:bg-accent-teal hover:opacity-90 text-gray-900 dark:text-white rounded-lg font-medium transition-all"
            >
              <span className="text-2xl">✅</span>
              <span>TODO</span>
            </button>

            {/* 템플릿 */}
            <button
              onClick={() => navigate(`/template/${fileId}`)}
              className="flex items-center gap-3 p-4 bg-accent-sage dark:bg-accent-teal hover:opacity-90 text-gray-900 dark:text-white rounded-lg font-medium transition-all"
            >
              <span className="text-2xl">📋</span>
              <span>템플릿</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
