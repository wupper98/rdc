const express = require('express');  
const passport = require('passport');  
const GoogleStrategy = require('passport-google-oauth20').Strategy;  
const session = require('express-session');

const app = express();  
const port = process.env.PORT || 8888;
require('dotenv').config();

// Serve static files
app.use(express.static(__dirname + '/public'));

// Add session support
app.use(session({  
  secret: process.env.SESSION_SECRET || 'default_session_secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());  
app.use(passport.session());

passport.serializeUser((user, done) => {  
  done(null, user);
});

passport.deserializeUser((userDataFromCookie, done) => {  
  done(null, userDataFromCookie);
});

// Checks if a user is logged in
const accessProtectionMiddleware = (req, res, next) => {  
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(403).json({
      message: 'must be logged in to continue',
    });
  }
};

// Set up passport strategy
passport.use(new GoogleStrategy(  
  {
    clientID: process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_SECRET,
    callbackURL: 'http://localhost:8888/auth/google/callback',
    scope: ['email'],
  },
  (accessToken, refreshToken, profile, cb) => {
    console.log('Our user authenticated with Google, and Google sent us back this profile info identifying the authenticated user:', profile);
    return cb(null, profile);
  },
));

// Create API endpoints

// This is where users point their browsers in order to get logged in
// This is also where Google sends back information to our app once a user authenticates with Google
app.get('/auth/google/callback',  
  passport.authenticate('google', { failureRedirect: '/', session: true }),
  (req, res) => {
    console.log('wooo we authenticated, here is our user object:', req.user);
    // res.json(req.user);
    res.redirect('/pippo.html');
  }
);

app.get('/protected', accessProtectionMiddleware, (req, res) => {  
  res.json({
    message: 'You have accessed the protected endpoint!',
    yourUserInfo: req.user,
  });
});

// Start server
const server = app.listen(port, function() {  
  console.log('Server listening on port ' + port);
  console.log(process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID +"\n");
});
   
    
