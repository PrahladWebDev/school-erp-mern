import React from 'react';
import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,textAlign:'center',padding:24}}>
      <div style={{fontSize:'5rem',lineHeight:1}}>🏫</div>
      <h1 style={{fontSize:'4rem',fontWeight:800,color:'var(--gray-200)'}}>404</h1>
      <h2 style={{color:'var(--gray-700)'}}>Page Not Found</h2>
      <p style={{color:'var(--gray-400)',maxWidth:300}}>The page you are looking for does not exist or has been moved.</p>
      <Link to="/" className="btn btn-primary">Go to Home</Link>
    </div>
  );
}
