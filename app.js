var fs = require('fs');
var request = require('request');
var junk = require('junk');

var express = require('express');
var app = express();
var path = require('path');

var phantom = require('phantom');

phantom.create(function (ph) {
  ph.createPage(function (page) {
    page.open("http://www.metoffice.gov.uk/public/weather/marine-printable/shipping-forecast.html", function (status) {
      console.log("Opening Met Office website -> ", status);
      page.evaluate(function () { return document.getElementById('content').innerHTML; }, function (result) {
        result = result.replace(/<[^>]*>/g, '%');
        result = result.replace(/%%%%%/g, '%');
        result = result.replace(/%%%%/g, '%');
        result = result.replace(/%%%/g, '%');
        result = result.replace(/%%/g, '%');
        result = result.trim();
        result = result.substring(1);
        fs.writeFileSync('public/latest.txt', result);
        console.log('Latest forecast file saved.');
        ph.exit();
      });
    });
  });
});

app.engine('html', require('ejs').renderFile);
app.use(express.static(path.join(__dirname, 'public')));

var server = app.listen((process.env.PORT || 3000 ), function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});

if (process.env.REDIS_URL) {
  var client = require('redis').createClient(process.env.REDIS_URL);
} else {
  var client = require('redis').createClient();
}

//http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
  }
  return s4() + s4();
}

var bodyParser = require('body-parser');
// var multer = require('multer'); // v1.0.5
// var upload = multer(); // for parsing multipart/form-data

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.post('/share', function (req, res) {
  req.accepts('json');
  var id = guid();
  client.set(id, JSON.stringify(req.body));
  client.lpush('idlist', id);
  // res.send(id);
  res.send({ haikuId: id });
});

app.get('/haiku/:id', function (req, res) {
  client.get(req.params.id, function(err, data) {
    if (err) {
      console.log(err);
    } else {
      res.send(data);
    }
  });
});

app.get('/list/length', function (req, res) {
  client.llen('idlist', function(err, data) {
    if (err) {
      console.log(err);
    } else {
      res.sendStatus(data);
    }
  });
});

app.get('/list/range', function (req, res) {
  // sample request: /list/range?min=0&max=10

  var min = req.query.min;
  var max = req.query.max;
  var range = max - min;

  var haikus = [];
  function getHaiku (id, index, ids) {
    client.get(id, function(err, data) {
      if (err) {
        return err;
      } else {
        haikus[index] = data;
        if (index === ids.length - 1) {
          res.send(haikus);
        }
      }
    });
  }

  if (range <= 10 && range > 0) {
    client.lrange('idlist', min, max, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        // res.send(data);
        data.forEach(getHaiku);
      }
    });
  } else {
    res.send('invalid range');
  }
});

// sync version of reading files, so that page won't try to read while file is being written
var files = fs.readdirSync("public/audio/");
files = files.filter(junk.not);
console.log("Folder names read.");

fs.writeFile("public/folder_list.txt", files, function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log("Folder list updated.");
  }
});

files.forEach(writeFolderList);

function writeFolderList (element, index, array) {
  var folderFiles =  fs.readdirSync("public/audio/" + element + "/");
  folderFiles = folderFiles.filter(junk.not);
  fs.writeFile("public/" + element + "_list.txt", folderFiles, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("File list updated --> " + element);
    }
  });
}
