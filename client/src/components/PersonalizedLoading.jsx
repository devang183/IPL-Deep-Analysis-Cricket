import MatrixLoader from './MatrixLoader';

/**
 * Personalized loading component - now uses MatrixLoader
 */
function PersonalizedLoading({ userName = 'honey', context = 'statistics' }) {
  const message = `Calculating ${context} for you, ${userName}...`;

  return <MatrixLoader text={message} />;
}

export default PersonalizedLoading;
