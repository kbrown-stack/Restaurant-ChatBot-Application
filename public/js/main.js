// This is the main js logic file.

document.addEventListener('DOMContentLoaded', () => {
    // Get or create device ID from localStorage
    let deviceId = localStorage.getItem('restaurant_chatbot_device_id');
    if (!deviceId) {
      deviceId = generateUUID();
      localStorage.setItem('restaurant_chatbot_device_id', deviceId);
    }
    
    // Check if returning from payment
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('success');
    const paymentReference = urlParams.get('reference');
    
    // Initialize socket connection

    // const socket = io('',{  // my deployed page
    //   query: {
    //     deviceId: deviceId
    //   }
    // });

    // const socket = io( "https://restaurant-chatbot-application.onrender.com",
    //   {query:{
    //     deviceId: deviceId
    //   }
    // });


  //   const socket = io(`${location.origin}`, {
  //     auth: { userId },
  //     transports: ['websocket'],
  // });

  const isLocalhost = window.location.hostname === 'localhost';
  const socket = io(isLocalhost ? 'http://localhost:4000' : 'https://restaurant-chatbot-application-1.onrender.com', {
    query: {
      deviceId: deviceId
    },
    transports: ['websocket']
  });
  



    // Adding a conenction log

    socket.on('connect', () => {
      console.log('socket connected:', socket.id); // this helps to log socket connection.
    });

    socket.on('disconnect', () => {
      console.warn('socket disconnected');
    })

    socket.on('connect_error', (err) => {
      console.error('Connection Failed:', err.message); // logging connection errors.
    })

    
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
  
    // Handle form submission
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = messageInput.value.trim();

      if (message) {
        addMessage('user', message);
      
      // Send message to server
      socket.emit('user_message', message);
      
      // Clear input
      messageInput.value = '';
    }
  });

  // Listen for bot messages
  socket.on('bot_message', (message) => {
    addMessage('bot', message);
    
    // Auto-scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
  
  // Listen for device ID from server
  socket.on('set_device_id', (id) => {
    deviceId = id;
    localStorage.setItem('restaurant_chatbot_device_id', deviceId);
  });
  
  // Listen for payment redirect
  socket.on('payment_redirect', (url) => {
    window.location.href = url;
  });
  
  // Handle payment success
  if (paymentSuccess === 'true' && paymentReference) {
    // Notify server about successful payment
    socket.emit('payment_success', paymentReference);
    
    // Remove query params to prevent duplicate processing
    window.history.replaceState({}, document.title, '/');
  }

  // Add message to the UI
  function addMessage(sender, content) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = content;
    chatMessages.appendChild(messageElement);
    
    // Auto-scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Generate UUID for device identification
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
});
      

