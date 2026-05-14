import React from 'react';

export default function BasicTest() {
  return (
    <div style={{ 
      height: '100vh', 
      backgroundColor: '#111827', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: 'white', fontSize: '32px', marginBottom: '16px' }}>基础测试页面</h1>
        <p style={{ color: '#9CA3AF', fontSize: '16px' }}>这是一个基础测试页面</p>
      </div>
    </div>
  );
}
