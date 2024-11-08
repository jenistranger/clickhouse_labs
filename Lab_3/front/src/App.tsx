import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });

  const [previousCoordinates, setPreviousCoordinates] = useState({ x: 0, y: 0 });

  const [mouseState, setMouseState] = useState('calm'); // по умолчанию - "calm"

  const [buttonText, setButtonText] = useState('');

  const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);

  const [clickInfo, setClickInfo] = useState<string>('Click somewhere on the screen');

  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  const handleMouseMove = (event: MouseEvent) => {
    const newCoordinates = { x: event.clientX, y: event.clientY };
    setCoordinates(newCoordinates);

    if (mouseState !== 'active') {
      setMouseState('active');
    }
  };

  const handleMouseIdle = () => {
    if (mouseState !== 'calm') {
      setMouseState('calm');
    }
  };

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;

    const startIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(handleMouseIdle, 1000); // если не двигается 1 секунду, меняем состояние на "calm"
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousemove', startIdleTimer);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousemove', startIdleTimer);
      clearTimeout(idleTimer); 
    };
  }, [mouseState]);

  const handleButtonClick = (text: string) => {
    setButtonText(text); 
    setClickInfo(`You clicked on ${text}`); 
  };

  const handleClick = (event: React.MouseEvent) => {
    const { clientX, clientY } = event;
    setClickPosition({ x: clientX, y: clientY });

    const deltaX = clientX - previousCoordinates.x;
    const deltaY = clientY - previousCoordinates.y;

    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON') {
      setClickInfo(`You clicked on button: ${target.textContent}`);
    } else {
      setClickInfo('You clicked on the screen background');
    }

    const currentDate = new Date();
    const formattedTime = currentDate
      .toISOString()
      .slice(0, 19)
      .replace('T', ' '); 

    fetch('http://127.0.0.1:8000/upload-mouse-movement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        x: clientX,
        y: clientY,
        deltaX: deltaX,
        deltaY: deltaY,
        clientTimeStamp: formattedTime, 
        button: 0,
        target: target.tagName === 'BUTTON' ? target.textContent : 'screen',
      }),
    })
      .then(response => response.json())
      .then(data => console.log('Data successfully sent:', data))
      .catch(error => console.error('Error:', error));

    setPreviousCoordinates({ x: clientX, y: clientY });
    setLastUpdateTime(formattedTime);

    setTimeout(() => setClickPosition(null), 500);
  };

  useEffect(() => {
    if (mouseState === 'calm') {
      const deltax = coordinates.x - previousCoordinates.x;
      const deltay = coordinates.y - previousCoordinates.y;

      if (deltax !== 0 || deltay !== 0) {
        const currentDate = new Date();
        const formattedTime = currentDate
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '); 

        fetch('http://127.0.0.1:8000/upload-mouse-movement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            x: coordinates.x,
            y: coordinates.y,
            deltaX: deltax,
            deltaY: deltay,
            clientTimeStamp: formattedTime,
            button: -1, 
            target: '',
          }),
        })
          .then(response => response.json())
          .then(data => console.log('Data successfully sent:', data))
          .catch(error => console.error('Error:', error));

       
        setPreviousCoordinates(coordinates);
        setLastUpdateTime(formattedTime); 
      }
    }
  }, [coordinates, mouseState, previousCoordinates]);

  return (
    <div
      style={{ height: '100vh', backgroundColor: 'white', position: 'relative' }}
      onClick={handleClick} 
    >

      <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '16px', color: 'black' }}>
        <div>
          x: {coordinates.x}, y: {coordinates.y}
        </div>
        <div>
          Mouse State: {mouseState}
        </div>
   
        {lastUpdateTime && (
          <div>
            Last update: {lastUpdateTime}
          </div>
        )}
      </div>

     
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)' }}>
        <button
          onClick={() => handleButtonClick('Button 1')}
          style={{ marginBottom: '10px' }}
        >
          Button 1
        </button>
        <button onClick={() => handleButtonClick('Button 2')}>Button 2</button>
      </div>

      {buttonText && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '20px',
            color: 'black',
          }}
        >
          {clickInfo}
        </div>
      )}

      {clickPosition && (
        <div
          style={{
            position: 'absolute',
            top: clickPosition.y - 20,
            left: clickPosition.x - 20,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
          }}
        />
      )}
    </div>
  );
}

export default App;
