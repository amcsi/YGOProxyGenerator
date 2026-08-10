function request(url) {
	console.log('requesting url:');
	console.log(url);
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 2000;
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.response)
        } else {
          reject(xhr.status)
        }
      }
    }
    xhr.ontimeout = function () {
      reject('timeout')
    }
    xhr.open('get', url, true)
    xhr.send();
  });
}

function requestWithTimeout(url, timeoutMs) {
	console.log('requesting url:');
	console.log(url);
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.timeout = timeoutMs;
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.response)
        } else {
          reject(xhr.status)
        }
      }
    }
    xhr.ontimeout = function () {
      reject('timeout')
    }
    xhr.open('get', url, true)
    xhr.send();
  });
}

function requestArrayBuffer(url) {
	url = YGODecklistParse.rewriteYgoProDeckImageUrl(url);
	console.log('requesting AB url:');
	console.log(url);
  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 2000;
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.response)
        } else {
			console.log("rejecting with " + xhr.status);
			reject(xhr.status)
        }
      }
    }
    xhr.ontimeout = function () {
      reject('timeout')
    }
	xhr.responseType = 'arraybuffer';
    xhr.open('get', url, true)
    xhr.send();
  });
}

var imagePos = 0;
var failedLines = [];

const pdfPointsPerInch = 72;
const cardWidth = 2.32 * pdfPointsPerInch;// a card is 2.32 inch and 1 point is 1/72 inch
//const cardHeight = 3.25 * pdfPointsPerInch;
var pdfWidth = 8.26 * pdfPointsPerInch;
var pdfHeight= 11.69 * pdfPointsPerInch;



function addImageToDoc(doc){
	return (img_url)=>{			
			console.log('image: ');
			console.log(img_url);
			var img = doc.openImage(img_url);
			var scaledWidth = cardWidth * document.getElementById("card_scale").value;
			console.log("scaledcardwith " + scaledWidth);
			var scaledHeight = scaledWidth / img.width * img.height;
			var scaledWidthPlusMargin = scaledWidth + Number(document.getElementById("margin_cards").value);
			console.log("cardwithplusmargin " + scaledWidthPlusMargin);
			var scaledHeightPlusMargin = scaledHeight + Number(document.getElementById("margin_cards").value);
			console.log(scaledWidthPlusMargin);
			var imgCountHorizontal = Math.floor((pdfWidth - 2*document.getElementById("margin_document").value) / scaledWidthPlusMargin);
			var imgCountVertical = Math.floor((pdfHeight-2*document.getElementById("margin_document").value) / scaledHeightPlusMargin);
			
			if(imagePos >= imgCountHorizontal * imgCountVertical)
			{
				doc.addPage();
				imagePos = 0;
			}
			
			var xPos = imagePos%imgCountHorizontal;
			var yPos = Math.floor(imagePos/imgCountHorizontal);
			
			
			doc.image(img, Number(document.getElementById("margin_document").value) + xPos * scaledWidthPlusMargin, 
				Number(document.getElementById("margin_document").value) + yPos * scaledHeightPlusMargin, {width: scaledWidth});
				
			imagePos = (imagePos + 1);			
	};
}

var duelingBookIndexesPromise = null;

function loadDuelingBookIndexes() {
	if (!duelingBookIndexesPromise) {
		duelingBookIndexesPromise = requestWithTimeout('https://static.duelingbook.com/cards.json', 60000)
			.then(function (result) {
				var data = JSON.parse(result);
				if (!Array.isArray(data.cards)) {
					return Promise.reject(new Error('invalid DuelingBook catalog shape'));
				}
				return YGODuelingBook.buildIndexes(data.cards);
			});
	}
	return duelingBookIndexesPromise;
}

function getYgoProDeckImage(cardNameOrId, versionNumber){
	return request('https://db.ygoprodeck.com/api/v7/cardinfo.php?name=' + encodeURIComponent(cardNameOrId))
	.catch((function(name){return (error)=>request('https://db.ygoprodeck.com/api/v7/cardinfo.php?id=' + encodeURIComponent(name))})(cardNameOrId))
	.catch(function(name){
		return (error)=>
		{
			while(name.length < 8){
			name = '0' +name;
			}
		return request('https://db.ygoprodeck.com/api/v7/cardinfo.php?id=' + encodeURIComponent(name));}
	}(cardNameOrId))
	.then(function (result){
		var data = JSON.parse(result);
		console.log('requesting result');
		console.log(data);
		return requestArrayBuffer(data.data[0].card_images[versionNumber].image_url);
	});
}

function runImageAttempts(attempts) {
  var chain = Promise.reject(new Error('no-attempts'));
  for (var i = 0; i < attempts.length; i++) {
    (function (attempt) {
      chain = chain.catch(function () {
        if (attempt.type === 'duelingbook' || attempt.type === 'ygoprodeck-direct') {
          return requestArrayBuffer(attempt.url);
        }
        if (attempt.type === 'ygoprodeck-api') {
          return getYgoProDeckImage(attempt.cardNameOrId, attempt.artIndex);
        }
        return Promise.reject(new Error('unknown-attempt'));
      });
    })(attempts[i]);
  }
  return chain;
}

function getImageUrl(cardNameOrId, versionNumber, preferDb, override) {
  return function () {
    return loadDuelingBookIndexes()
      .then(function (indexes) {
        return indexes;
      })
      .catch(function () {
        return null;
      })
      .then(function (indexes) {
        var attempts = YGOImageSource.resolveAttempts({
          cardNameOrId: cardNameOrId,
          artIndex: versionNumber,
          preferDb: preferDb,
          override: override,
          dbIndexes: indexes,
          findMatches: YGODuelingBook.findMatches,
          imageUrlForRow: YGODuelingBook.imageUrlForRow
        });
        return runImageAttempts(attempts);
      });
  };
}


function generateProxies(){
	imagePos = 0;
	failedLines = [];
	
	// create a document the same way as above
	const doc = new PDFDocument({size: document.getElementById("paper_size").value});
	
	//set pdf widht&height for image positions
	pdfWidth = doc.page.width;
	pdfHeight= doc.page.height;

	// pipe the document to a blob
	const stream = doc.pipe(blobStream());
	stream.on('finish', function() {
		/*var iframe = document.querySelector('iframe');*/
		  // get a blob you can do whatever you like with
		const blob = stream.toBlob('application/pdf');
		saveAs(blob, "download.pdf");	 
	});


	var lines = document.getElementById("decklist_input").value.split('\n');
	var overallProcess = Promise.resolve();
	
	for(var i = 0; i < lines.length; i++){
		if(/^\/\//.test(lines[i]) || /^#/.test(lines[i]) || /^!/.test(lines[i])){
			console.log("skipping comment " + lines[i]);
			continue;
		}

		var parsed = YGODecklistParse.parseDecklistLine(lines[i]);
		if (parsed && (parsed.cardNameOrId !== '' || parsed.directUrl)) {
			var amount = parsed.amount;
			var versionNumber = parsed.artIndex;
			var cardToken = parsed.cardNameOrId;
			var directUrl = parsed.directUrl;
			var preferEl = document.getElementById('prefer_duelingbook_images');
			var preferDb = preferEl
				? preferEl.checked
				: YGOImageSource.readPreferDb(localStorage);
			var fetchImage = directUrl
				? (function (url) {
						return function () {
							return requestArrayBuffer(url);
						};
					})(directUrl)
				: getImageUrl(cardToken, versionNumber, preferDb, parsed.override);
			overallProcess = overallProcess
				.then(fetchImage)
				.then(
					function (innerNumber) {
						return function (img) {
							return Promise.all(
								[...Array(innerNumber).keys()].map(function () {
									return addImageToDoc(doc)(img);
								})
							);
						};
					}(amount),
					function (line) {
						return function () {
							failedLines.push(line);
						};
					}(lines[i].trim())
				);
		}
	}
	
	overallProcess = overallProcess
		.then(()=>{
			if(failedLines.length != 0){
				var error_message = "could not process following lines: \n";
				failedLines.forEach(line => error_message = error_message + "\n" + line);
				alert(error_message);
			}})
		.then(()=>doc.end())
		.catch(console.log.bind(console));
}

function dragOverHandler(e) {
  console.log('File(s) in drop zone'); 
  e.stopPropagation();
  e.preventDefault();
}

function dropHandler(ev) {
  console.log('File(s) dropped');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
		file.text()
		.then((content)=>{
			var ta = document.getElementById("decklist_input");
			ta.value = ta.value + content;
		});
        console.log('... file[' + i + '].name = ' + file.name);
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name);
    }
  }
}

(function initPreferDuelingBookCheckbox() {
  var el = document.getElementById('prefer_duelingbook_images');
  if (!el) {
    return;
  }
  el.checked = YGOImageSource.readPreferDb(localStorage);
  el.addEventListener('change', function () {
    YGOImageSource.writePreferDb(localStorage, el.checked);
  });
})();



