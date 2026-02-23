import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QuizSearch = () => {
  const [quizCode, setQuizCode] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    // Basic validation
    if (!quizCode) {
      alert('Vui lòng nhập mã đề thi.');
      return;
    }

    // In a real application, you would fetch quiz details from an API
    // For this example, we'll simply navigate to the exam page with the entered code
    // Assuming the exam page route is /exam/:quizCode
    navigate(`/exam/${quizCode}`);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px'
    }}>
      <h1>Tìm kiếm Đề Thi</h1>
      <p>Nhập mã đề thi để bắt đầu làm bài:</p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <input
          type="text"
          placeholder="Mã đề thi"
          value={quizCode}
          onChange={(e) => setQuizCode(e.target.value)}
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <button
          onClick={handleSearch}
          style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#007BFF', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Tìm kiếm
        </button>
      </div>
    </div>
  );
};

export default QuizSearch;