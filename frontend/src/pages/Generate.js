import React, { useState } from 'react';

const Generate = () => {
  const [text, setText] = useState('');
  const [questionType, setQuestionType] = useState('Trắc nghiệm');
  const [quantity, setQuantity] = useState(5);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setGeneratedQuestions([]);

    try {
      const response = await fetch('http://localhost:3000/api/questions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          text,
          type: questionType,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể sinh câu hỏi.');
      }

      setGeneratedQuestions(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle) {
      setSaveMessage({ type: 'error', text: 'Vui lòng nhập tên cho bộ đề thi.' });
      return;
    }
    setIsSaving(true);
    setSaveMessage('');
    try {
      const response = await fetch('http://localhost:3000/api/quizzes/create-from-generated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: quizTitle,
          questions: generatedQuestions
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể lưu đề thi.');
      }
      setSaveMessage({ type: 'success', text: `Lưu thành công! Mã đề thi của bạn là: ${data.quizCode}` });
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShuffleQuestions = () => {
    // Thuật toán Fisher-Yates shuffle
    const shuffled = [...generatedQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setGeneratedQuestions(shuffled);
  };

  const renderQuestions = () => {
    if (generatedQuestions.length === 0) {
      return <p style={{ color: '#666', textAlign: 'center' }}>Kết quả sẽ được hiển thị ở đây.</p>;
    }

    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#333', margin: 0 }}>Kết Quả</h2>
            <button 
              onClick={handleShuffleQuestions}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                padding: '8px 15px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
              Trộn câu hỏi
            </button>
        </div>
        {generatedQuestions.map((q, index) => (
          <div key={q.id} style={{ marginBottom: '25px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', background: '#f9f9f9', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'}}>
            <p style={{ fontWeight: 'bold', margin: '0 0 15px 0', fontSize: '17px' }}>{`Câu ${index + 1}: ${q.question}`}</p>
            {q.type === 'Trắc nghiệm' && q.options && (
              <ul style={{ listStyleType: 'none', paddingLeft: '0', margin: '0' }}>
                {q.options.map((option, i) => (
                  <li
                    key={i}
                    style={{
                      padding: '10px',
                      margin: '4px 0',
                      borderRadius: '4px',
                      background: option === q.correctAnswer ? '#d4edda' : '#f1f1f1',
                      color: option === q.correctAnswer ? '#155724' : '#333',
                      borderLeft: option === q.correctAnswer ? '4px solid #28a745' : '4px solid #ddd',
                    }}
                  >
                    {String.fromCharCode(65 + i)}. {option}
                  </li>
                ))}
              </ul>
            )}
            {q.type === 'Tự luận' && (
              <div>
                <p style={{ fontStyle: 'italic', color: '#555' }}>Gợi ý trả lời:</p>
                <p style={{ background: '#e9ecef', padding: '10px', borderRadius: '4px' }}>{q.answer}</p>
              </div>
            )}
            {q.type === 'Điền khuyết' && (
               <div>
                <p style={{ fontStyle: 'italic', color: '#555' }}>Các từ cần điền:</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {q.blanks.map((blank, i) => (
                    <span key={i} style={{ background: '#d4edda', color: '#155724', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' }}>{blank}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        <div style={{ marginTop: '30px', padding: '20px', background: '#e9ecef', borderRadius: '8px' }}>
            <h3 style={{marginTop: 0}}>Lưu Bộ Đề Thi</h3>
            <input 
              type="text"
              placeholder="Nhập tên cho bộ đề thi..."
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button 
              onClick={handleSaveQuiz}
              disabled={isSaving}
              style={{
                backgroundColor: isSaving ? '#ccc' : '#28a745',
                color: 'white',
                padding: '12px 25px',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                width: '100%'
              }}>
              {isSaving ? 'Đang lưu...' : 'Lưu và Tạo Đề Thi'}
            </button>
            {saveMessage && (
              <p style={{ 
                color: saveMessage.type === 'success' ? 'green' : 'red', 
                textAlign: 'center', 
                marginTop: '15px',
                fontWeight: 'bold'
              }}>
                {saveMessage.text}
              </p>
            )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>Sinh Câu Hỏi Tự Động</h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
        Dán đoạn văn bản của bạn vào ô dưới đây, chọn loại và số lượng câu hỏi mong muốn, sau đó nhấn "Sinh câu hỏi".
      </p>
      
      <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', fontSize: '18px' }}>1. Nhập văn bản nguồn</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán nội dung tài liệu, bài giảng, hoặc một đoạn văn bản bất kỳ vào đây..."
            style={{ width: '100%', boxSizing: 'border-box', height: '250px', padding: '15px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', fontFamily: 'inherit' }}
          ></textarea>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '30px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>2. Chọn loại câu hỏi</label>
            <select value={questionType} onChange={(e) => setQuestionType(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}>
              <option value="Trắc nghiệm">Trắc nghiệm</option>
              <option value="Tự luận">Tự luận</option>
              <option value="Điền khuyết">Điền khuyết</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>3. Chọn số lượng</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
              min="1"
              max="20"
              style={{ width: '80px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
            />
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={isLoading || !text}
          style={{ backgroundColor: isLoading || !text ? '#ccc' : '#007BFF', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '4px', cursor: isLoading || !text ? 'not-allowed' : 'pointer', fontSize: '18px', width: '100%' }}>
          {isLoading ? 'Đang xử lý...' : 'Sinh Câu Hỏi'}
        </button>
      </div>

      <hr style={{ margin: '40px 0', border: '0', borderTop: '1px solid #eee' }} />

      <div id="result-section">
        {error && <p style={{ color: 'red', textAlign: 'center' }}>Lỗi: {error}</p>}
        {isLoading ? <p style={{ textAlign: 'center' }}>Đang sinh câu hỏi, vui lòng chờ trong giây lát...</p> : renderQuestions()}
      </div>
    </div>
  );
};

export default Generate;