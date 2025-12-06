import './MatrixLoader.css';

function MatrixLoader({ text = 'Loading...' }) {
  const digits = ['1', '0', '1', '1', '0', '0', '1', '0'];

  return (
    <div className="matrix-loader-container">
      <div className="ai-matrix-loader">
        {digits.map((digit, index) => (
          <div key={index} className="digit">
            {digit}
          </div>
        ))}
        <div className="glow"></div>
      </div>
      {text && <p className="matrix-loader-text">{text}</p>}
    </div>
  );
}

export default MatrixLoader;
