export const environment = {
  production: false,

  // Golang backend API endpoints
  ssoApiUrl: 'http://localhost:8014',   // SSO service (auth)
  // quizApiUrl: 'http://localhost:8025',  // Quiz service
  quizApiUrl: '/quizapi',  // Quiz service

  // App config
  appEnv: 'dev',
  firebase: {
    apiKey: "AIzaSyB87rURIr77E3tDuCexFfYOag0Kjfps9UU",
    authDomain: "project1-1a4a4.firebaseapp.com",
    projectId: "project1-1a4a4",
    storageBucket: "project1-1a4a4.firebasestorage.app",
    messagingSenderId: "325276788809",
    appId: "1:325276788809:web:b76ebd6a98a363059a7798",
    measurementId: "G-WZCD5RRY82"
  }
};
