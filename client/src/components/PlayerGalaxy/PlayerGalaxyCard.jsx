import { useState, useRef } from 'react';
import './PlayerGalaxyCard.css';

function PlayerGalaxyCard({ player, metadata, onSelect }) {
  const playerMeta = metadata[player] || {};
  const [isRevealed, setIsRevealed] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;

    const deltaX = Math.abs(touchEndX - touchStartX.current);
    const deltaY = Math.abs(touchEndY - touchStartY.current);

    // If horizontal movement is greater than vertical, it's a swipe
    if (deltaX > deltaY && deltaX > 30) {
      setIsRevealed(true);
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  const handleClick = () => {
    if (isRevealed) {
      onSelect && onSelect(player);
    } else {
      setIsRevealed(true);
    }
  };

  return (
    <div className="player-card-parent">
      <div
        className={`player-card ${isRevealed ? 'revealed' : ''}`}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="player-card-glass">
          <div className="player-card-content">
            <span className="player-name">{player}</span>
            <div className="player-details">
              {playerMeta.battingstyle && playerMeta.battingstyle !== 'N/A' && (
                <div className="player-detail-item">
                  <span className="player-detail-label">Batting:</span> {playerMeta.battingstyle}
                </div>
              )}
              {playerMeta.bowlingstyle && playerMeta.bowlingstyle !== 'N/A' && (
                <div className="player-detail-item">
                  <span className="player-detail-label">Bowling:</span> {playerMeta.bowlingstyle}
                </div>
              )}
              {playerMeta.position && playerMeta.position !== 'N/A' && (
                <div className="player-detail-item">
                  <span className="player-detail-label">Role:</span> {playerMeta.position}
                </div>
              )}
              {playerMeta.country_name && playerMeta.country_name !== 'N/A' && (
                <div className="player-detail-item">
                  <span className="player-detail-label">Country:</span> {playerMeta.country_name}
                </div>
              )}
            </div>
          </div>
          <div className="player-card-bottom">
            <div className="view-more">
              <button className="view-more-button">View Stats</button>
              <svg className="svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        </div>
        <div className="player-card-logo">
          <span className="circle circle1"></span>
          <span className="circle circle2"></span>
          <span className="circle circle3"></span>
          <span className="circle circle4"></span>
          <span className="circle circle5">
            <svg className="svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" />
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

export default PlayerGalaxyCard;
