var value = 0;
const broadcastChannel = new BroadcastChannel("obs_tournament_broadcast_channel");
const counterId = getUrlParameter("id");
addEvent(document, "load", ()=>{
	initializeOnLoad();
});

function updateCounterContent(){
    container = document.getElementById("valueContainer");
    container.textContent = value;
}

function addEvent(elem, evType, fn) {
	if (elem.addEventListener) {
		elem.addEventListener(evType, fn, {"once": true, "capture": true});
	}
	else if (elem.attachEvent) {
		elem.attachEvent('on' + evType, fn);
	}
	else {
		elem['on' + evType] = fn;
	}
}

function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};

function initializeOnLoad(){
	connectToDashboard();
	
	broadcastChannel.addEventListener("message", (event)=>{
        if(event.data.command == "notify_dashboard_ready"){
            connectToDashboard();
        }
		else if(event.data.command == "ping_counters"){
			sendPong();
		}
		else if(event.data.command == "update_counter"){
			if (event.data.hasOwnProperty("value") && event.data.hasOwnProperty("id") && event.data["id"] == counterId){
                value = event.data["value"];
                updateCounterContent();
            }
		}
    });
}

function connectToDashboard(){
    broadcastChannel.postMessage({command: "connect_counter", value: counterId});
}

function sendPong(){
    console.log("pong");
    broadcastChannel.postMessage({command: "pong_from_counter", value: counterId});
}