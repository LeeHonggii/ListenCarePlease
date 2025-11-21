import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TaggingPageNew() {
  const { fileId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [taggingData, setTaggingData] = useState(null)
  const [speakerNames, setSpeakerNames] = useState({}) // SPEAKER_XX -> 이름 매핑
  const [transcript, setTranscript] = useState([]) // 개별 발화 수정 가능
  const [view, setView] = useState('summary') // 'summary' or 'detail'

  useEffect(() => {
    fetchTaggingData()
  }, [fileId])

  const fetchTaggingData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/tagging/${fileId}`)
      setTaggingData(response.data)

      // 초기 화자 이름 매핑 (final_name 우선, 없으면 suggested_name)
      const initialNames = {}
      response.data.suggested_mappings.forEach((mapping) => {
        initialNames[mapping.speaker_label] = mapping.final_name || mapping.suggested_name || ''
      })
      setSpeakerNames(initialNames)

      // 대본 초기화 (개별 수정 가능하도록)
      setTranscript(response.data.sample_transcript.map(seg => ({
        ...seg,
        speaker_label: seg.speaker_label // 개별 화자 변경 가능
      })))

      setLoading(false)
    } catch (error) {
      console.error('태깅 데이터 조회 실패:', error)
      setLoading(false)
    }
  }

  const handleBulkNameChange = (speakerLabel, name) => {
    setSpeakerNames({ ...speakerNames, [speakerLabel]: name })
  }

  const handleSegmentSpeakerChange = (index, newSpeaker) => {
    const updated = [...transcript]
    updated[index].speaker_label = newSpeaker
    setTranscript(updated)
  }

  const applyBulkMapping = (fromSpeaker, toName) => {
    // 일괄 적용: 해당 화자의 모든 발화를 이름으로 변경
    setSpeakerNames({ ...speakerNames, [fromSpeaker]: toName })
  }

  const handleConfirm = async () => {
    try {
      // 최종 매핑 전송 (개별 수정 반영)
      const finalMappings = Object.entries(speakerNames).map(([speaker_label, name]) => ({
        speaker_label,
        final_name: name.trim() || speaker_label
      }))

      await axios.post(`${API_BASE_URL}/api/v1/tagging/confirm`, {
        file_id: fileId,
        mappings: finalMappings
      })

      navigate(`/result/${fileId}`)
    } catch (error) {
      console.error('태깅 확정 실패:', error)
      alert('태깅 확정에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 transition-colors duration-300 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const allNamesFilled = Object.values(speakerNames).every(name => name.trim() !== '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 transition-colors duration-300 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">화자 태깅</h1>
          <p className="text-gray-600 dark:text-gray-300">각 화자에게 이름을 매핑하거나 개별 발화를 수정하세요</p>
        </div>

        {/* 뷰 전환 버튼 */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setView('summary')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              view === 'summary'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            📊 요약 뷰 (일괄 매핑)
          </button>
          <button
            onClick={() => setView('detail')}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              view === 'detail'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            📝 상세 뷰 (개별 수정)
          </button>
        </div>

        {view === 'summary' ? (
          // 요약 뷰: 화자별 일괄 매핑
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">🎤 화자 목록</h2>
              {taggingData?.suggested_mappings.map((mapping) => (
                <div key={mapping.speaker_label} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{mapping.speaker_label}</h3>
                    <div className="flex gap-2">
                      {mapping.nickname && (
                        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full">
                          {mapping.nickname}
                        </span>
                      )}
                      {mapping.suggested_name && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 px-3 py-1 rounded-full">
                          제안: {mapping.suggested_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    value={speakerNames[mapping.speaker_label] || ''}
                    onChange={(e) => handleBulkNameChange(mapping.speaker_label, e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />

                  {/* 빠른 선택 - 이름 */}
                  {taggingData?.detected_names && taggingData.detected_names.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">이름 선택:</p>
                      <div className="flex flex-wrap gap-2">
                        {taggingData.detected_names.map((name, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleBulkNameChange(mapping.speaker_label, name)}
                            className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded-full text-sm transition-colors"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 빠른 선택 - 닉네임 */}
                  {taggingData?.detected_nicknames && taggingData.detected_nicknames.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">닉네임 선택:</p>
                      <div className="flex flex-wrap gap-2">
                        {taggingData.detected_nicknames.map((nickname, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleBulkNameChange(mapping.speaker_label, nickname)}
                            className="px-3 py-1 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-200 rounded-full text-sm transition-colors"
                          >
                            {nickname}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 미리보기 */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">👀 미리보기</h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-h-[600px] overflow-y-auto space-y-3">
                {transcript.map((seg, idx) => {
                  const displayName = speakerNames[seg.speaker_label] || seg.speaker_label
                  return (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1">{displayName}</div>
                      <div className="text-gray-700 dark:text-gray-200 text-sm">{seg.text}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          // 상세 뷰: 전체 대본에서 개별 수정
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              📝 전체 대본 (개별 발화 수정 가능)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              💡 각 발화마다 화자를 선택할 수 있습니다. 대부분은 일괄 매핑으로 처리하고, 예외만 여기서 수정하세요.
            </p>

            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {transcript.map((seg, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Math.floor(seg.start_time)}초
                  </div>

                  <select
                    value={seg.speaker_label}
                    onChange={(e) => handleSegmentSpeakerChange(idx, e.target.value)}
                    className="flex-shrink-0 px-3 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {taggingData?.suggested_mappings.map((m) => (
                      <option key={m.speaker_label} value={m.speaker_label}>
                        {speakerNames[m.speaker_label] || m.speaker_label}
                      </option>
                    ))}
                  </select>

                  <div className="flex-1 text-gray-700 dark:text-gray-200">{seg.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 확정 버튼 */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleConfirm}
            disabled={!allNamesFilled}
            className={`w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
              allNamesFilled
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {allNamesFilled ? '✅ 태깅 완료 → 결과 보기' : '⚠️ 모든 화자의 이름을 입력해주세요'}
          </button>

          {/* 홈으로 가기 버튼 */}
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition"
            >
              홈으로 가기
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              나중에 대시보드에서 이어서 진행할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
