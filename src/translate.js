let OG_TEXT_NODES = null;
let WEB_PAGE_NODES = null;
let COUNT_TEXT_SECTIONS = 0;
let OG_TEXT = null;
let ACTIVATE = true;
let LANGUAGE = null;
let PREV_WIKI_IFRAME = null;
let DOWN = null, UP = null;
let PREV_IFRAME_WORD = null;
let DISTHINT = false;
let GAME = false;
let XLT = false;
let ITALIC = true;
let RIGHTTOLEFT = null;
const TIMEOUT = 300;
const DEBUG = true;
let WORKING_URL = "";
// Options for the observer (which mutations to observe)
const mutconfig = { characterData: true, childList: true, subtree: true  };
// Callback function to execute when mutations are observed
const mutexec = (mutationList, observer) => {
	for (let mutation of mutationList) {
		print("MUTATION LIST")
		print(mutation)
		if (mutation.type === "childList" || mutation.type === "subtree") {
			console.log("A child node has been added or removed.");
			for (let i=0; i<mutation.addedNodes.length; i++) {
				if (mutation.addedNodes[i].classList)
					if (mutation.addedNodes[i].classList.contains("glishseen")) {
						return;
				} else {
					grab_and_go(mutation.addedNodes[i]); //false
				}
			}
		} else if (mutation.type === "characterData") {
			grab_and_go(mutation.target); //false
		}
	}
};
const observer = new MutationObserver(mutexec);
/*
This page is improperly named. All translation happens in Background.js. On load or a setting change, translate.js sends
the textnodes to background.js. Background.js translates the nodes and returns the updated version. Translate.js then
weaves that text back into the main page. Beware, code gets Uglier as it goes on.
 */

window.addEventListener('load',
	function () {
		prepareglishcss();
		grab_and_go();
		attachDialog();
	}, false);

document.addEventListener("input", function(e) {print("INPUT"); print(e); if (GAME){wordgame_enterkey_handler(e)}});

chrome.runtime.onMessage.addListener( function (request, sender, sendResponse) {
	print("received message, ["+request.message+"] ")
	print(request)
	//page no longer valid, send page back to get translated.
	switch(request.message) {
		case "hardrun":
			grab_and_go(); //true
			break;
		case "changed":
			if (OG_TEXT_NODES) {
				just_go()
			} else {
				grab_and_go();
			}
			sendResponse();
			break;
		case "deactivate":
			if (ACTIVATE) {
				ACTIVATE = false;
				print("Deactivating")
				if (OG_TEXT_NODES){
					weave_nodes(OG_TEXT)
				}
			}
			sendResponse();
			break;
		case "activate":
			if (!ACTIVATE) {
				print("Activating")

				ACTIVATE = true;
				if (OG_TEXT_NODES) {
					print("Foreign HTML already exists, setting...")
					just_go();
				} else {
					print("No foreign HTML, grabbing and going...")
					grab_and_go();
				}
			}
			sendResponse();
			break;
		case "style":
			editglishcss(request.glishbold, request.glishitalic)
			break;
		case "xlt":
			XLT = request.xlt;
			sendResponse();
			break;
		case "r2l":
			RIGHTTOLEFT = request.r2l;
			sendResponse();
			break;
		case "game":
			GAME = request.game;
			if (OG_TEXT_NODES) {
				just_go()
			} else {
				grab_and_go();
			}
			sendResponse();
			break;
		case "hnt":
			DISTHINT = request.hnt;
			sendResponse();
			break;
	}
});


function editglishcss(bold, italic) {
	const b = bold ? "bold" : "none";
	const i = italic ? "italic" : "none";
	ITALIC = i;
	document.getElementById("glishcss").innerHTML = ".glishword {font-weight:" + b + "; font-style:" + i + ";}";
}

function prepareglishcss(){
	let sheet = document.createElement("style");
	sheet.innerHTML = ".glishword {}";
	sheet.id = "glishcss";
	document.getElementsByTagName("head")[0].appendChild(sheet);
}

function attachDialog(){
	const dialog = document.createElement("dialog");
	const msg = document.createElement('div');
	const dummyiframe = document.createElement("iframe");
	dialog.classList.add("glishdialog");
	msg.classList.add("glishmsg")
	dialog.id = "glishdlg";
	msg.id = "glishclickoff"
	msg.innerHTML = "Click off window to close.<br>";
	dialog.appendChild(msg);
	dialog.appendChild(dummyiframe);
	document.body.appendChild(dialog);
	PREV_WIKI_IFRAME = dummyiframe;
}

function refreshIframe(url) {
	const iframe = document.createElement("iframe");
	iframe.id = "glishiframe";
	iframe.src = url;
	iframe.style.border = '0';
	iframe.style.borderColor = "whitesmoke"
	document.getElementById('glishdlg').replaceChild(iframe, PREV_WIKI_IFRAME)
	PREV_WIKI_IFRAME = iframe;
}

function grab_and_go(startnode=document.body) {
	print("grabbing and going");
	if (!ACTIVATE){
		print("not activated")
		return;
	}
	let latesturl;
	chrome.runtime.sendMessage({message: "valid_website"}, function (response) {
		if (!response || response.payload === "stop") {
			print("Not allowed!!!")
			ACTIVATE = false;
			return;
		} else {
			latesturl = response.url;
		}
		print("Allowed!!!")

		if (latesturl !== WORKING_URL) {
				chrome.runtime.sendMessage({message: "get_gme"}, function (gameresp) {
					chrome.runtime.sendMessage({message: "get_xlt"}, function (xltresp) {
						chrome.runtime.sendMessage({message: "get_r2l"}, function (r2lresp) {
							chrome.runtime.sendMessage({message: "get_hnt"}, function (hntresp) {
								GAME = gameresp.payload;
								XLT = xltresp.payload;
								RIGHTTOLEFT = r2lresp.payload;
								DISTHINT = hntresp.payload;
								WEB_PAGE_NODES = getTextNodes(document.body);
								OG_TEXT_NODES = WEB_PAGE_NODES.map((x) => x.outerHTML);
								OG_TEXT = WEB_PAGE_NODES.map((x) => x.textContent);
								just_go();
							});
						});
					});
				});
		} else {
			let newfoundnodes = getTextNodes(startnode);
			print("New found nodes: ");
			print(newfoundnodes);
			if (newfoundnodes.length < 1){
				return;
			}
			let nodeoffset = WEB_PAGE_NODES.length;
			WEB_PAGE_NODES = [...WEB_PAGE_NODES, ...newfoundnodes];
			OG_TEXT_NODES = [...OG_TEXT_NODES, ...newfoundnodes.map((x) => x.outerHTML)];
			OG_TEXT = [...OG_TEXT, ...newfoundnodes.map((x) => x.textContent)];
			just_go(nodeoffset);
		}
		WORKING_URL = latesturl;
	});
}


function just_go(nodeoffset = 0) {

	print("GOT THIS MANY TEXT SECTIONS: " + OG_TEXT_NODES.length)
	if (!ACTIVATE){ //COUNT_TEXT_SECTIONS < 8 ||
		print("Ending because activated is : "+ACTIVATE)//+", or COUNT is "+COUNT_TEXT_SECTIONS)
		return;
	}

	chrome.runtime.sendMessage({message:"translate", payload:OG_TEXT.slice(nodeoffset)}, function(response){
		print("Received lang data:")
		if (!response) {
			return;
		}
		LANGUAGE = response.language.replace('2','');


		editglishcss(response.glishbold, response.glishitalic);
		const translated_info = response.payload;
		weave_nodes(translated_info, nodeoffset);
		print("setting inner HTML");
	})
}


function weave_nodes(node_list, nodeoffset=0){
	print("weaving nodes")

	let newnode = null;
	observer.disconnect()
	for (let i = 0; i < node_list.length; i++){
		// Only change text items that have been edited. Or change back to normal those that have been. ie source and dest chunk has an edit.
		if (!node_list[i].includes("<span class=\"glish") && ! (WEB_PAGE_NODES[i].innerHTML && WEB_PAGE_NODES[i].innerHTML.includes("<span class=\"glish")) ){
			continue;
		}
		try {
			let allnodesi = i + nodeoffset;
			newnode = document.createElement("span");
			newnode.classList.add("glishseen")
			newnode.innerHTML = node_list[i];

			WEB_PAGE_NODES[allnodesi].parentNode.replaceChild(newnode, WEB_PAGE_NODES[allnodesi]);

			WEB_PAGE_NODES[allnodesi] = newnode;
		} catch (e) {
			print(e);
			print('"'+ node_list[i] +'"');
		}

	}
	if(GAME && ACTIVATE) {
		print("In game:")
		let hintword = null;
		let blurnbr = null;
		let editdist = null;
		[...document.querySelectorAll(".glishword")].forEach(function (item) {
			item.classList.remove("glishword")
			item.classList.add("glishseen")
			if (!item || !item.parentNode) return;
			let fathernode = document.createElement('span');
			fathernode.classList.add("glishseen")
			item.setAttribute('contenteditable', 'true');
			item.setAttribute("spellcheck","false")
			//add border, background #E95420
			item.classList.add('glishtextarea')
			item.textContent = "____"

			//add location to write edit distance
			editdist = document.createElement("span");
			editdist.classList.add("glishseen")
			editdist.title = "The number of letters off from an answer.";

			//add blur word following
			hintword = document.createElement("span");
			hintword.classList.add("glishseen")
			hintword.title = "Click to hide blurred answer (hint).";
			hintword.textContent = ' (' + item.title+")";
			hintword.style.fontStyle=ITALIC;
			hintword.classList.add("hintword")

			blurnbr = document.createElement("span");
			blurnbr.classList.add("glishseen")
			blurnbr.title = "Click to  reveal answers";
			blurnbr.textContent = " " + item.dataset.nvoc.split("$",1)[0];
			blurnbr.classList.add("blurtext");
			blurnbr.style.fontStyle=ITALIC;

			item.title = "Click and type the correct foreign word. \nWhen finished, hit the [Enter] key for judgement.\nClick on the blurred answer if you give up."
			item.parentNode.replaceChild(fathernode, item);
			fathernode.appendChild(item);
			fathernode.appendChild(editdist);
			fathernode.appendChild(hintword);
			fathernode.appendChild(blurnbr);
		})
	}
	if(ACTIVATE) observer.observe(document.body, mutconfig)
}













/*
function initMO(root = document.body) {
	console.log("In mutator")
	let MO = window.MutationObserver || window.WebKitMutationObserver;
	let observer = new MO(function(mutations) {
		observer.disconnect();
		console.log("NEW GROUP:")
		console.log(mutations.length)
		console.log(mutations)
		sloppy_clear_duplicate_muts(mutations)
		console.log("after clear")
		console.log(mutations)
		mutations.forEach(function(mutation){
			if (mutation === null){
				return;
			}
			let node = mutation.target;
			grab_and_go(false, node);
		});
		//prompt();
		observe();
	});
	let opts = { characterData: true, childList: true, subtree: true };
	let observe = function() {
		observer.takeRecords();
		observer.observe(root, opts)
	};
	observe();
}

//n^2 but it's okay bc it prevents repeat tree traversals and I think the
// array length is short, like <20 usually. Dunno though.
function sloppy_clear_duplicate_muts(mutations) {
	for (let i = 0; i < mutations.length; i++){
		if (!mutations[i]){
			continue;
		}
		for (let j = i + 1; j < mutations.length; j++){
			if (!mutations[j]){
				continue;
			}
			if (mutations[i].target === mutations[j].target){
				mutations[j] = null;
			}
		}
	}
}


 */


document.body.addEventListener("mousedown", function(e) {
	if (e.button !== 0) { // left click for mouse
		return;
	}

	DOWN = e.timeStamp;

	const localdown = DOWN;
	setTimeout(()=>{
		// click & hold
		if (UP <= localdown) {
			iframe(e);
		}
	}, 200)
});

document.body.addEventListener("mouseup", function(e) {
	if (e.button !== 0) { // left click for mouse
		return;
	}
	// clever way of seeing doubleclick?
	if (( e.timeStamp - UP) < TIMEOUT){
		const t = e.target;
		if (t.classList.contains('glishword')) {
			t.textContent = t.title;
			if (t.dataset.cpt === 'y')
				t.textContent = capitalize(t.textContent);
			t.dataset.eng = "y";
			t.dataset.nvi = '0';
		}
		UP = e.timeStamp;
		return;
	}
	UP = e.timeStamp;

	// click
	if ((UP - DOWN) < TIMEOUT) {
		clickhandler(e);

		//check to see if iframe window should be closed:
		if (document.getElementById('glishdlg').open ){
			const rectA = document.getElementById("glishdlg").getBoundingClientRect();
			const rectB = document.getElementById("glishclickoff").getBoundingClientRect();
			function clickedInDialog (rect) {
				return 	rect.top <= e.clientY &&
					e.clientY <= rect.top + rect.height &&
					rect.left <= e.clientX &&
					e.clientX <= rect.left + rect.width;
			}
			if (!clickedInDialog(rectA) || clickedInDialog(rectB))
				document.getElementById("glishdlg").close();
		}

	}
});

function clickhandler(e) {
	const t = e.target;
	print(t)
	if (!t) return;
	if (t.classList.contains("glishanswers")) {
		t.style.display = "none";
		// refers to english word hint
		t.previousSibling.title = "Click to show answers."
		return;
	}
	else if (t.classList.contains("hintword")) {
		// refers to answers
		if (t.nextSibling.style.display === "none"){
			t.nextSibling.style.display = "";
			t.title = "Click to hide answers."
		} else {
			t.nextSibling.style.display = "none";
			t.title = "Click to show answers."
		}
		return;
	}
	else if (t.classList.contains('blurtext')) {
		// lol
		const textboxnode = t.previousSibling.previousSibling.previousSibling;

		t.classList.remove('blurtext');
		t.textContent = " [" + textboxnode.dataset.nvoc.replaceAll('$', ', ') + "]";
		t.classList.add("glishanswers")
		t.title = "Click to hide answers."
		t.previousSibling.title = "Click to hide answers."
		textboxnode.style.borderWidth = '0'
		textboxnode.setAttribute("contenteditable", 'false')
		textboxnode.title = "Incorrect. This question is now locked."
		textboxnode.nextSibling.style.display = "none";
		setWrong(t.parentNode);
		return;
	}
	if (!t.classList.contains('glishword') || t.classList.contains('glishtextarea')) {
		return;
	}

	rotateWord(t);
}


function rotateWord(t) {
	const otherwords = t.dataset.nvoc.split('$');
	if (otherwords.length === 1) {
		//flash word red
		flashred(t);

	}

	let i = Number(t.dataset.nvi)

	if (i === 0 && t.dataset.eng === "n") {
		//first time clicking
		// search for main word, remove it from list and postpend it. Coulda done it earlier but whatever
		const shownword = t.firstChild.textContent.toLowerCase();
		const copycatidx = otherwords.indexOf(shownword);
		otherwords[copycatidx] = otherwords[0];
		otherwords[0] = shownword;
		t.dataset.nvoc = otherwords.join('$');
	}
	t.dataset.eng = "n";
	i = (i  + 1) % otherwords.length;

	t.dataset.nvi = "" + i;
	if (t.dataset.cpt === 'y'){
		t.firstChild.textContent = capitalize(otherwords[i]);
	} else {
		t.firstChild.textContent = otherwords[i];
	}
}

function iframe(e) {
	const t = e.target;
	if (!t || !t.attributes || !t.attributes.class || t.attributes.class.value !== "glishword") {
		return;
	}
	// replacing the accent mark ́ and other fucked chars
	let foreign_word = t.firstChild.textContent.replace(/[ֵּًَُُِّّْ́]/g, "");
	if (t.dataset.cpt === 'y') {
		foreign_word = foreign_word.toLowerCase();
	}


	if (!PREV_IFRAME_WORD || foreign_word !== PREV_IFRAME_WORD) {
		refreshIframe("https://en.wiktionary.org/wiki/" + foreign_word + "#" + LANGUAGE);
	}
	document.getElementById('glishdlg').showModal();
	PREV_IFRAME_WORD = foreign_word;
}

function capitalize(word){
	if (word) {
		return word.charAt(0).toUpperCase() + word.slice(1);
	}
}

function getTextNodes(parent = document.body){
    let all = [];
	let lookedat = null;
    for (parent = parent.firstChild; parent; parent = parent.nextSibling) {
        if (!parent || ['SCRIPT','STYLE', 'A', 'CODE', 'BUTTON', 'META', "NOSCRIPT"].indexOf(parent.tagName) >= 0 || (parent.classList && parent.classList.contains("glishseen"))) {
			continue;
		}

        if (parent.nodeType === Node.TEXT_NODE && parent.data.trim()) {
			parent.parentElement.classList.add("glishseen");
			all.push(parent);
			if (parent.textContent.length > 25) {
				COUNT_TEXT_SECTIONS += 1;
			}
		} else {
			all = all.concat(getTextNodes(parent));
		}
    }
    return all;
}



/*
// if letter input, ignore it
// if event is a new line (IE ENTER KEY) then remove new line and check for correctness
 */
function wordgame_enterkey_handler(ev) {
	print("In handler wordgame")
	const node = ev.target;
	if (!node.classList.contains("glishtextarea")){
		return;
	}

	node.textContent = node.textContent.replaceAll("_", "");
	print(node.textContent.length)

	print('enter hit')
	if (ev.inputType === "insertParagraph" || ev.inputType === "insertLineBreak") {
		print("Enter Through")

		let userGuess = node.textContent.replaceAll("\n", "");
		userGuess = userGuess.replaceAll("<br>", "");
		node.textContent = userGuess;
		// CORRECTION CHECK:
		// orange color is #E95420
		let possibleAnswers = node.dataset.nvoc.split("$");
		if (!XLT) {
			possibleAnswers = possibleAnswers.map((x) => {return latinise(x)});
			userGuess = latinise(userGuess);
			possibleAnswers = possibleAnswers.map((x) => {return x.toLowerCase()});
			userGuess = userGuess.toLowerCase();
		}
		print(possibleAnswers)
		print(userGuess)
		if (possibleAnswers.indexOf(userGuess) >= 0){
			const answernode = node.nextSibling.nextSibling.nextSibling;
			node.style.borderWidth = '0'
			node.style.textDecorationLine = "none";
			node.style.textDecorationStyle = 'none';
			node.style.textDecorationColor = 'none';
			node.style.textDecorationSkipInk = 'none';
			node.parentNode.style.borderBottomColor =  "lime";
			node.parentNode.style.borderBottomStyle = 'solid';
			node.parentNode.style.borderBottomWidth = '1px';
			node.title = "Well done! You may continue guessing if you'd like.";
			answernode.previousSibling.title = "Click to hide answers."
			answernode.title = "Click to hide answers."

			print("removing blur")
			print(node)
			print(node.nextSibling)
			print(answernode)
			print(answernode.classList)

			answernode.classList.remove("blurtext")
			answernode.textContent = " [" + node.dataset.nvoc.replaceAll('$', ', ') + "]";
			answernode.classList.add("glishanswers")
			node.nextSibling.textContent = "";


		} else {
			//node.style.borderBottomColor ="red";
			//node.style.borderBottomStyle = 'solid';
			setWrong(node);
			if (DISTHINT) {
				let minedit = Math.min(...possibleAnswers.map((poss) => {
					return levenshteinDistance(userGuess, poss)
				}));
				//put the min edit distance in the textbox itself
				node.nextSibling.textContent = " ("+minedit+" letter" + ((minedit>1)?"s":"") + " away) ";
			} else {
				node.nextSibling.textContent = "";
			}
			flashred(node);
		}

	}
	if (node.textContent.length === 0){
		node.textContent = "____"
	}
	//reset cursor
	let range = document.createRange()
	let sel = window.getSelection()
	range.setStart(node.firstChild, RIGHTTOLEFT ? 0 : node.firstChild.length);
	print("writing backwards? "+RIGHTTOLEFT)
	range.collapse(RIGHTTOLEFT);
	sel.removeAllRanges()
	sel.addRange(range)

}
function setWrong(node){
	node.style.textDecorationLine = "underline";
	node.style.textDecorationStyle = 'wavy';
	node.style.textDecorationColor = 'red';
	node.style.textDecorationSkipInk = 'none';
}

function flashred(node) {
	const og_color = node.style.color;
	if (og_color === "red") return;
	node.style.color = "red";
	setTimeout(()=> node.style.color = og_color, 200)
}

/*
stolen from Martin Ille
https://stackoverflow.com/a/9667817
 */
const latinise = function(s){
	let latin_map={"Á":"A","Ă":"A","Ắ":"A","Ặ":"A","Ằ":"A","Ẳ":"A","Ẵ":"A","Ǎ":"A","Â":"A","Ấ":"A","Ậ":"A","Ầ":"A","Ẩ":"A","Ẫ":"A","Ä":"A","Ǟ":"A","Ȧ":"A","Ǡ":"A","Ạ":"A","Ȁ":"A","À":"A","Ả":"A","Ȃ":"A","Ā":"A","Ą":"A","Å":"A","Ǻ":"A","Ḁ":"A","Ⱥ":"A","Ã":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ḃ":"B","Ḅ":"B","Ɓ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ć":"C","Č":"C","Ç":"C","Ḉ":"C","Ĉ":"C","Ċ":"C","Ƈ":"C","Ȼ":"C","Ď":"D","Ḑ":"D","Ḓ":"D","Ḋ":"D","Ḍ":"D","Ɗ":"D","Ḏ":"D","ǲ":"D","ǅ":"D","Đ":"D","Ƌ":"D","Ǳ":"DZ","Ǆ":"DZ","É":"E","Ĕ":"E","Ě":"E","Ȩ":"E","Ḝ":"E","Ê":"E","Ế":"E","Ệ":"E","Ề":"E","Ể":"E","Ễ":"E","Ḙ":"E","Ë":"E","Ė":"E","Ẹ":"E","Ȅ":"E","È":"E","Ẻ":"E","Ȇ":"E","Ē":"E","Ḗ":"E","Ḕ":"E","Ę":"E","Ɇ":"E","Ẽ":"E","Ḛ":"E","Ꝫ":"ET","Ḟ":"F","Ƒ":"F","Ǵ":"G","Ğ":"G","Ǧ":"G","Ģ":"G","Ĝ":"G","Ġ":"G","Ɠ":"G","Ḡ":"G","Ǥ":"G","Ḫ":"H","Ȟ":"H","Ḩ":"H","Ĥ":"H","Ⱨ":"H","Ḧ":"H","Ḣ":"H","Ḥ":"H","Ħ":"H","Í":"I","Ĭ":"I","Ǐ":"I","Î":"I","Ï":"I","Ḯ":"I","İ":"I","Ị":"I","Ȉ":"I","Ì":"I","Ỉ":"I","Ȋ":"I","Ī":"I","Į":"I","Ɨ":"I","Ĩ":"I","Ḭ":"I","Ꝺ":"D","Ꝼ":"F","Ᵹ":"G","Ꞃ":"R","Ꞅ":"S","Ꞇ":"T","Ꝭ":"IS","Ĵ":"J","Ɉ":"J","Ḱ":"K","Ǩ":"K","Ķ":"K","Ⱪ":"K","Ꝃ":"K","Ḳ":"K","Ƙ":"K","Ḵ":"K","Ꝁ":"K","Ꝅ":"K","Ĺ":"L","Ƚ":"L","Ľ":"L","Ļ":"L","Ḽ":"L","Ḷ":"L","Ḹ":"L","Ⱡ":"L","Ꝉ":"L","Ḻ":"L","Ŀ":"L","Ɫ":"L","ǈ":"L","Ł":"L","Ǉ":"LJ","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ń":"N","Ň":"N","Ņ":"N","Ṋ":"N","Ṅ":"N","Ṇ":"N","Ǹ":"N","Ɲ":"N","Ṉ":"N","Ƞ":"N","ǋ":"N","Ñ":"N","Ǌ":"NJ","Ó":"O","Ŏ":"O","Ǒ":"O","Ô":"O","Ố":"O","Ộ":"O","Ồ":"O","Ổ":"O","Ỗ":"O","Ö":"O","Ȫ":"O","Ȯ":"O","Ȱ":"O","Ọ":"O","Ő":"O","Ȍ":"O","Ò":"O","Ỏ":"O","Ơ":"O","Ớ":"O","Ợ":"O","Ờ":"O","Ở":"O","Ỡ":"O","Ȏ":"O","Ꝋ":"O","Ꝍ":"O","Ō":"O","Ṓ":"O","Ṑ":"O","Ɵ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Õ":"O","Ṍ":"O","Ṏ":"O","Ȭ":"O","Ƣ":"OI","Ꝏ":"OO","Ɛ":"E","Ɔ":"O","Ȣ":"OU","Ṕ":"P","Ṗ":"P","Ꝓ":"P","Ƥ":"P","Ꝕ":"P","Ᵽ":"P","Ꝑ":"P","Ꝙ":"Q","Ꝗ":"Q","Ŕ":"R","Ř":"R","Ŗ":"R","Ṙ":"R","Ṛ":"R","Ṝ":"R","Ȑ":"R","Ȓ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꜿ":"C","Ǝ":"E","Ś":"S","Ṥ":"S","Š":"S","Ṧ":"S","Ş":"S","Ŝ":"S","Ș":"S","Ṡ":"S","Ṣ":"S","Ṩ":"S","Ť":"T","Ţ":"T","Ṱ":"T","Ț":"T","Ⱦ":"T","Ṫ":"T","Ṭ":"T","Ƭ":"T","Ṯ":"T","Ʈ":"T","Ŧ":"T","Ɐ":"A","Ꞁ":"L","Ɯ":"M","Ʌ":"V","Ꜩ":"TZ","Ú":"U","Ŭ":"U","Ǔ":"U","Û":"U","Ṷ":"U","Ü":"U","Ǘ":"U","Ǚ":"U","Ǜ":"U","Ǖ":"U","Ṳ":"U","Ụ":"U","Ű":"U","Ȕ":"U","Ù":"U","Ủ":"U","Ư":"U","Ứ":"U","Ự":"U","Ừ":"U","Ử":"U","Ữ":"U","Ȗ":"U","Ū":"U","Ṻ":"U","Ų":"U","Ů":"U","Ũ":"U","Ṹ":"U","Ṵ":"U","Ꝟ":"V","Ṿ":"V","Ʋ":"V","Ṽ":"V","Ꝡ":"VY","Ẃ":"W","Ŵ":"W","Ẅ":"W","Ẇ":"W","Ẉ":"W","Ẁ":"W","Ⱳ":"W","Ẍ":"X","Ẋ":"X","Ý":"Y","Ŷ":"Y","Ÿ":"Y","Ẏ":"Y","Ỵ":"Y","Ỳ":"Y","Ƴ":"Y","Ỷ":"Y","Ỿ":"Y","Ȳ":"Y","Ɏ":"Y","Ỹ":"Y","Ź":"Z","Ž":"Z","Ẑ":"Z","Ⱬ":"Z","Ż":"Z","Ẓ":"Z","Ȥ":"Z","Ẕ":"Z","Ƶ":"Z","Ĳ":"IJ","Œ":"OE","ᴀ":"A","ᴁ":"AE","ʙ":"B","ᴃ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʛ":"G","ʜ":"H","ɪ":"I","ʁ":"R","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴌ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ɶ":"OE","ᴐ":"O","ᴕ":"OU","ᴘ":"P","ʀ":"R","ᴎ":"N","ᴙ":"R","ꜱ":"S","ᴛ":"T","ⱻ":"E","ᴚ":"R","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","á":"a","ă":"a","ắ":"a","ặ":"a","ằ":"a","ẳ":"a","ẵ":"a","ǎ":"a","â":"a","ấ":"a","ậ":"a","ầ":"a","ẩ":"a","ẫ":"a","ä":"a","ǟ":"a","ȧ":"a","ǡ":"a","ạ":"a","ȁ":"a","à":"a","ả":"a","ȃ":"a","ā":"a","ą":"a","ᶏ":"a","ẚ":"a","å":"a","ǻ":"a","ḁ":"a","ⱥ":"a","ã":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ḃ":"b","ḅ":"b","ɓ":"b","ḇ":"b","ᵬ":"b","ᶀ":"b","ƀ":"b","ƃ":"b","ɵ":"o","ć":"c","č":"c","ç":"c","ḉ":"c","ĉ":"c","ɕ":"c","ċ":"c","ƈ":"c","ȼ":"c","ď":"d","ḑ":"d","ḓ":"d","ȡ":"d","ḋ":"d","ḍ":"d","ɗ":"d","ᶑ":"d","ḏ":"d","ᵭ":"d","ᶁ":"d","đ":"d","ɖ":"d","ƌ":"d","ı":"i","ȷ":"j","ɟ":"j","ʄ":"j","ǳ":"dz","ǆ":"dz","é":"e","ĕ":"e","ě":"e","ȩ":"e","ḝ":"e","ê":"e","ế":"e","ệ":"e","ề":"e","ể":"e","ễ":"e","ḙ":"e","ë":"e","ė":"e","ẹ":"e","ȅ":"e","è":"e","ẻ":"e","ȇ":"e","ē":"e","ḗ":"e","ḕ":"e","ⱸ":"e","ę":"e","ᶒ":"e","ɇ":"e","ẽ":"e","ḛ":"e","ꝫ":"et","ḟ":"f","ƒ":"f","ᵮ":"f","ᶂ":"f","ǵ":"g","ğ":"g","ǧ":"g","ģ":"g","ĝ":"g","ġ":"g","ɠ":"g","ḡ":"g","ᶃ":"g","ǥ":"g","ḫ":"h","ȟ":"h","ḩ":"h","ĥ":"h","ⱨ":"h","ḧ":"h","ḣ":"h","ḥ":"h","ɦ":"h","ẖ":"h","ħ":"h","ƕ":"hv","í":"i","ĭ":"i","ǐ":"i","î":"i","ï":"i","ḯ":"i","ị":"i","ȉ":"i","ì":"i","ỉ":"i","ȋ":"i","ī":"i","į":"i","ᶖ":"i","ɨ":"i","ĩ":"i","ḭ":"i","ꝺ":"d","ꝼ":"f","ᵹ":"g","ꞃ":"r","ꞅ":"s","ꞇ":"t","ꝭ":"is","ǰ":"j","ĵ":"j","ʝ":"j","ɉ":"j","ḱ":"k","ǩ":"k","ķ":"k","ⱪ":"k","ꝃ":"k","ḳ":"k","ƙ":"k","ḵ":"k","ᶄ":"k","ꝁ":"k","ꝅ":"k","ĺ":"l","ƚ":"l","ɬ":"l","ľ":"l","ļ":"l","ḽ":"l","ȴ":"l","ḷ":"l","ḹ":"l","ⱡ":"l","ꝉ":"l","ḻ":"l","ŀ":"l","ɫ":"l","ᶅ":"l","ɭ":"l","ł":"l","ǉ":"lj","ſ":"s","ẜ":"s","ẛ":"s","ẝ":"s","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ᵯ":"m","ᶆ":"m","ń":"n","ň":"n","ņ":"n","ṋ":"n","ȵ":"n","ṅ":"n","ṇ":"n","ǹ":"n","ɲ":"n","ṉ":"n","ƞ":"n","ᵰ":"n","ᶇ":"n","ɳ":"n","ñ":"n","ǌ":"nj","ó":"o","ŏ":"o","ǒ":"o","ô":"o","ố":"o","ộ":"o","ồ":"o","ổ":"o","ỗ":"o","ö":"o","ȫ":"o","ȯ":"o","ȱ":"o","ọ":"o","ő":"o","ȍ":"o","ò":"o","ỏ":"o","ơ":"o","ớ":"o","ợ":"o","ờ":"o","ở":"o","ỡ":"o","ȏ":"o","ꝋ":"o","ꝍ":"o","ⱺ":"o","ō":"o","ṓ":"o","ṑ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","õ":"o","ṍ":"o","ṏ":"o","ȭ":"o","ƣ":"oi","ꝏ":"oo","ɛ":"e","ᶓ":"e","ɔ":"o","ᶗ":"o","ȣ":"ou","ṕ":"p","ṗ":"p","ꝓ":"p","ƥ":"p","ᵱ":"p","ᶈ":"p","ꝕ":"p","ᵽ":"p","ꝑ":"p","ꝙ":"q","ʠ":"q","ɋ":"q","ꝗ":"q","ŕ":"r","ř":"r","ŗ":"r","ṙ":"r","ṛ":"r","ṝ":"r","ȑ":"r","ɾ":"r","ᵳ":"r","ȓ":"r","ṟ":"r","ɼ":"r","ᵲ":"r","ᶉ":"r","ɍ":"r","ɽ":"r","ↄ":"c","ꜿ":"c","ɘ":"e","ɿ":"r","ś":"s","ṥ":"s","š":"s","ṧ":"s","ş":"s","ŝ":"s","ș":"s","ṡ":"s","ṣ":"s","ṩ":"s","ʂ":"s","ᵴ":"s","ᶊ":"s","ȿ":"s","ɡ":"g","ᴑ":"o","ᴓ":"o","ᴝ":"u","ť":"t","ţ":"t","ṱ":"t","ț":"t","ȶ":"t","ẗ":"t","ⱦ":"t","ṫ":"t","ṭ":"t","ƭ":"t","ṯ":"t","ᵵ":"t","ƫ":"t","ʈ":"t","ŧ":"t","ᵺ":"th","ɐ":"a","ᴂ":"ae","ǝ":"e","ᵷ":"g","ɥ":"h","ʮ":"h","ʯ":"h","ᴉ":"i","ʞ":"k","ꞁ":"l","ɯ":"m","ɰ":"m","ᴔ":"oe","ɹ":"r","ɻ":"r","ɺ":"r","ⱹ":"r","ʇ":"t","ʌ":"v","ʍ":"w","ʎ":"y","ꜩ":"tz","ú":"u","ŭ":"u","ǔ":"u","û":"u","ṷ":"u","ü":"u","ǘ":"u","ǚ":"u","ǜ":"u","ǖ":"u","ṳ":"u","ụ":"u","ű":"u","ȕ":"u","ù":"u","ủ":"u","ư":"u","ứ":"u","ự":"u","ừ":"u","ử":"u","ữ":"u","ȗ":"u","ū":"u","ṻ":"u","ų":"u","ᶙ":"u","ů":"u","ũ":"u","ṹ":"u","ṵ":"u","ᵫ":"ue","ꝸ":"um","ⱴ":"v","ꝟ":"v","ṿ":"v","ʋ":"v","ᶌ":"v","ⱱ":"v","ṽ":"v","ꝡ":"vy","ẃ":"w","ŵ":"w","ẅ":"w","ẇ":"w","ẉ":"w","ẁ":"w","ⱳ":"w","ẘ":"w","ẍ":"x","ẋ":"x","ᶍ":"x","ý":"y","ŷ":"y","ÿ":"y","ẏ":"y","ỵ":"y","ỳ":"y","ƴ":"y","ỷ":"y","ỿ":"y","ȳ":"y","ẙ":"y","ɏ":"y","ỹ":"y","ź":"z","ž":"z","ẑ":"z","ʑ":"z","ⱬ":"z","ż":"z","ẓ":"z","ȥ":"z","ẕ":"z","ᵶ":"z","ᶎ":"z","ʐ":"z","ƶ":"z","ɀ":"z","ﬀ":"ff","ﬃ":"ffi","ﬄ":"ffl","ﬁ":"fi","ﬂ":"fl","ĳ":"ij","œ":"oe","ﬆ":"st","ₐ":"a","ₑ":"e","ᵢ":"i","ⱼ":"j","ₒ":"o","ᵣ":"r","ᵤ":"u","ᵥ":"v","ₓ":"x"};
	return s.replace(/[^A-Za-z0-9\[\] ]/g,function(a){return latin_map[a]||a})
};

/*
stolen from https://www.30secondsofcode.org/js/s/levenshtein-distance
 */
const levenshteinDistance = (s, t) => {
	if (!s.length) return t.length;
	if (!t.length) return s.length;
	const arr = [];
	for (let i = 0; i <= t.length; i++) {
		arr[i] = [i];
		for (let j = 1; j <= s.length; j++) {
			arr[i][j] =
				i === 0
					? j
					: Math.min(
						arr[i - 1][j] + 1,
						arr[i][j - 1] + 1,
						arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
					);
		}
	}
	return arr[t.length][s.length];
};

function print(s) {
	if (DEBUG) {
		console.log(s);
	}
}
