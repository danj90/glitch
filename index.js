var express = require("express"),
    alexa = require("alexa-app"),
    request = require("request"),
    BASE_URL = 'https://api.forecast.io/forecast/' + process.env.WEATHER_API_KEY + '/32.7157, 117.1611', // Using coordinates of Washington DC, replace with your own or a lookup for an Alexa user's address
    PORT = process.env.PORT || 3000,
    app = express(),
    // Setup the alexa app and attach it to express before anything else.
    alexaApp = new alexa.app("");

// POST calls to / in express will be handled by the app.request() function
alexaApp.express({
  expressApp: app,
  checkCert: true,
  // sets up a GET route when set to true. This is handy for testing in
  // development, but not recommended for production.
  debug: true
});

app.set("view engine", "ejs");

alexaApp.launch(function(request, response) {
  console.log("App launched");
  response.say('I can tell you the weather<break time="1s"/> but you must give me a day, Dan, I am in the alexa app launch function!');
});

// The main Weather intent - checks if a day/date was supplied or not and sends the appropriate response
alexaApp.intent("Weather", {
    "slots": { "WHEN": "AMAZON.DATE" },
    "utterances": [
      "what's the weather for {WHEN}",
      "what I should expect on {WHEN}",
      "tell me the weather",
      "{WHEN}"
    ]
  },
  function(request, response) {
    console.log("In Weather intent");
    // If the requester specified a date/day
    if (request.data.request.intent.slots.WHEN &&
        request.data.request.intent.slots.WHEN.value) {
        // Request the weather - we're using Promises to delay the response until we have data back from forecast.io
        return getWeather(new Date(request.data.request.intent.slots.WHEN.value))
          .then(function (weather) {
            console.log('Responding to weather request for ' + request.data.request.intent.slots.WHEN.value + ' with:', weather);
            response.say("Hi Dan, here is custom weather from your weather bot <break time='1s'/>" + weather + "<break time='1s'/> That's all for now Dan");
          })
          .catch(function(err){
            response.say(err);
          });
    } else {
      // If the requester didn't specify a date/day
      console.log('Responding to weather request with no day/date');
      response.say('I can tell you the weather<break time="1s"/> but you must give me a day, Dan, I am in the function request response');
    }
  }
);

alexaApp.intent("AMAZON.CancelIntent", {
    "slots": {},
    "utterances": []
  }, function(request, response) {
    console.log("Sent cancel response");
  	response.say("Ok, sure thing");
  	return;
  }
);

alexaApp.intent("AMAZON.StopIntent", {
    "slots": {},
    "utterances": []
  }, function(request, response) {
    console.log("Sent stop response");
  	response.say("Alright, I'll stop");
  	return;
  }
);

alexaApp.sessionEnded(function(request, response) {
  console.log("In sessionEnded");
  console.error('Alexa ended the session due to an error');
  // no response required
});

// Looks up the weather for the date given, using forecast.io
function getWeather(day) {
  return new Promise(function(resolve, reject) {
    if (!day || day.toString() === 'Invalid Date') {
      return reject('Invalid date for weather!');
    }

    request({
      url: BASE_URL,
      json: true
    }, function(err, res, body) {
      var data, text, card,
          simpleDate = day.toISOString().split('T')[0];

      if (err || res.statusCode >= 400) {
        console.error(res.statusCode, err);
        return reject('Unable to get weather data!');
      }

      body.daily.data.forEach(function(dailyData) {
        if ((new Date(dailyData.time * 1000)).toISOString().split('T')[0] === simpleDate) {
          data = dailyData;
        }
      });

      if (!data) {
       return reject('I have no data for that day!');
      }

      text = getWeatherText(data);

      resolve(text);
    });
  });
}

// Converts the weather data into an understandable text string
function getWeatherText(data) {
  var conditions;
  
  if (data.precipProbability > 0.7 && data.precipIntensityMax > 0.05) {
    if (data.precipType === 'rain') {
      conditions = 'Don\'t forget your umbrella, Jacobs Family.';
    } else {
      conditions = 'Brace yourself for the snow, Jacobs Family.';
    }
  } else if (data.temperatureMax > 93 || data.apparentTemperatureMax > 98) {
    if (data.dewPoint > 72 || data.humidity > 0.75) {
      conditions = 'It\'s going to be nasty, temperature wise in mid nineties, Jacobs Family';
  } else {
      conditions = 'Prepare for a scorcher, above 93, Jacobs Family.';
    }
  } else if (data.temperatureMax < 35) {
    if (data.windSpeed > 15) {
      conditions = 'Prepare for bitter cold wind in your face, Jacobs Family.';
    } else {
      conditions = 'Bitterly cold temperatures are in store for Jacobs Family.';
    }
  } else if (data.dewPoint > 72 && data.humidity > 0.75) {
    conditions = 'The humidity is going to be brutal, Jacobs Family.';
  } else if (data.cloudCover > 0.85) {
    conditions = 'It will be very cloudy, Jacobs Family.';
  } else if (data.cloudCover < 0.1) {
    if (data.windSpeed > 15) {
      conditions = 'Lots of sun and breezy conditions are in store, Jacobs Family.';
    } else {
      conditions = 'There will be lots of sunshine, Jacobs Family.';
    }
  } else if (data.windSpeed > 20) {
    conditions = 'It\'s going to be gusty, Jacobs Family.';
  } else {
    conditions = data.summary;
  }

  return conditions;
}

app.listen(PORT, () => console.log("Listening on port " + PORT + "."));