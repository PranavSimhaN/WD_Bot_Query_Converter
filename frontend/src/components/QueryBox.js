import React, { useState } from 'react';
import axios from 'axios';

export default function QueryBox() {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const resp = await axios.post('/api/kg/query', { userQuestion: q });
      setAnswer(resp.data);
    } catch (err) {
      let errMsg = err.message;
      if (err.response?.data?.error) {
        const backendError = err.response.data.error;
        if (typeof backendError === 'object') {
          errMsg = backendError.message || JSON.stringify(backendError);
        } else {
          errMsg = String(backendError);
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{maxWidth:800, margin:'2rem auto'}}>
      <h2>KG Q&A</h2>
      <form onSubmit={handleSubmit}>
        <textarea value={q} onChange={(e)=>setQ(e.target.value)} rows={4} placeholder="Ask a question about the storage system..." style={{width:'100%'}} />
        <button type="submit" disabled={loading || !q.trim()} style={{marginTop:10}}>Ask</button>
      </form>

      {loading && <p>Loading...</p>}
      {error && <p style={{color:'red'}}>{error}</p>}

      {answer && (
        <div style={{marginTop:20}}>
          <h3>Answer</h3>
          <p>{answer.answer}</p>
          <h4>Details</h4>
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(answer, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
