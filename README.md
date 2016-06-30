## Shipping Forecasting
[(Live app)](http://www.shipping-forecasting.herokuapp.com)

Shipping forecaster visualizes [the latest Shipping Forecast bulletin](https://en.wikipedia.org/wiki/Shipping_Forecast), using the voices of BBC Radio 4 speakers to read it.

It downloads the text from Met Office's website using [PhantomJS](phantomjs.org/); the audio from BBC using [get_iplayer](https://github.com/get-iplayer/get_iplayer); splits the audio files into individual words using [audiogrep](https://github.com/antiboredom/audiogrep); and plays these audio files sequentially using [p5.js](https://p5js.org/).

#### Data sources
- [BBC Radio 4 Shipping Forecast broadcasts](http://www.bbc.co.uk/programmes/b006qfvv/episodes)
- [Met Office Shipping Forecast text](www.metoffice.gov.uk/public/weather/marine-printable/shipping-forecast.html)

#### Extracting audio samples for individual words
I transcribed the audio broadcasts using the amazing [audiogrep](https://github.com/antiboredom/audiogrep). Audiogrep uses pocketsphinx for audio transcription.

The problem is pocketsphinx is not accurate apparently for British broadcasting Enlgish. So I tried first to adapt its acoustic model. You can do that by "training" the existing US English model ([tutorial here](http://cmusphinx.sourceforge.net/wiki/tutorialam)).

Basically you can record (or use existing) audio files of someone reading a few sentences, and use these and their transcriptions as input to train the model. I thought this was going to be a good approach, since I could take an existing broadcast and cut it up in sentences, then pair it to the official text of the broadcast as its transcription. After doing this process, which took some time, I noticed no improvement at all when compared to the original US English model.

So I tried a different approach, which was to build my own custom dictionary using only words from the Shipping Forecast.

Using the new dictionary helped a lot to improve accuracy of the transcription. It still didn't get the new words that I inputed manually into the dictionary (such as "thundery," or "squally"), but overall the transcription was much cleaner.

After the audio is transcribed, audigrep lets you do many operations with it. I was interested in extracted individual words from the audio, which can be done like this:
    audiogrep --input broadcast-file.mp3 --extract

Audiogrep will proceed to extract every word it has found in the transcription into individual audio files. I could use this files to play in my web app.

#### Creating a shipping forecast dictionary for transcription
This was done by taking the text of a sample Shipping Forecast and extracting all its words. I adapted this text cleanup function:

    String.prototype.cleanup = function() {
      return this.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "|");
    }
[(source)](http://stackoverflow.com/questions/1983767/only-keep-a-z-0-9-and-remove-other-characters-from-string-using-javascript)

The result was a string like this:

    "shipping|forecast|the|shipping|forecast|issued|by|the|met|office|on|behalf|..."

I could then use this string to run a grep expression on the original pocketshpinx English dictionary, to extract **only the words contained in the Shipping Forecast.** The full dictionary file is a text file with one word per line, accompanied by its phonetic equivalent, like this:

    accommodate AH K AA M AH D EY T
    accommodated AH K AA M AH D EY T IH D
    accommodates AH K AA M AH D EY T S
    accommodating AH K AA M AH D EY T IH NG
    accommodation AH K AA M AH D EY SH AH N
    accommodations AH K AA M AH D EY SH AH N Z
    accommodative AH K AA M AH D EY T IH V
    accompanied AH K AH M P AH N IY D
    accompanies AH K AH M P AH N IY Z
    ...and so on.

[Grep expressions](http://stackoverflow.com/questions/15822927/how-to-delete-all-lines-in-text-file-that-not-begins-with-character-or-or) allow you to extract lines from a file that contain a pattern (could be a word, a list of words, or a Regular Expression). The expression I used looked for lines which contained any of the words in the shipping forecast:

    egrep -wi 'shipping|forecast|the|shipping|forecast|issued|by|the|met|office|...' original.dict > new-dictionary.txt

[(why I used egrep insted of just grep)](http://www.cyberciti.biz/faq/searching-multiple-words-string-using-grep/)

I had to use another expression to get rid of everything with hyphens and apostrophes:

    egrep -v "'|-" new-dictionary.txt > new-dictionary-clean.txt


Another expression was used to get all the numbers:

    egrep -wi 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eight|ninety|hundred|thousand|first|second|third|fourth|fifth|sixth|seventh|eight|ninth|tenth|eleventh|twelveth|thirteenth|fourteenth|fifteenth|sixteeth|seventeeth|eigtheenth|nineteenth|twentieth|thirtieth' original.dict > numbers.txt


After combining the numbers and cleaned up dictionary, I had a dictionary file that contained only words used in the Shipping Forecast. It looked something like this:

    a AH
    a(2) EY
    agency EY JH AH N S IY
    all AO L
    and AH N D
    and(2) AE N D
    are AA R
    are(2) ER
    area EH R IY AH
    areas EH R IY AH Z
    at AE T
    backing B AE K IH NG
    bailey B EY L IY
    becoming B IH K AH M IH NG
    behalf B IH HH AE F
    ...etc.

I substituted pocketsphinx original English dictionary for this "Shipping Forecast dictionary," by replacing the file in the pocketsphinx folder.
