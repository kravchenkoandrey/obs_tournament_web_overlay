var value = "";
const broadcastChannel = new BroadcastChannel("obs_tournament_broadcast_channel");
const playerId = getUriParameter("id");
addEvent(document, "DOMContentLoaded", ()=>{
	initializeOnContentLoad();
});

function updateNicknameContent(){
    container = document.getElementById("valueContainer");
    container.textContent = value ? value : "ID: " + getUriParameter("id");
}

function addEvent(elem = false, evType, fn, params) {
	if (elem.addEventListener) {
		elem.addEventListener(evType, fn, params);
	}
	else if (elem.attachEvent) {
		elem.attachEvent('on' + evType, fn);
	}
	else {
		elem['on' + evType] = fn;
	}
}

function getUriParameter(sParam) {
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

function initializeOnContentLoad(){
    updateNicknameContent();
	connectToDashboard();
	
    addEvent(broadcastChannel, "message", (event)=>{
        if(event.data.command == "notify_dashboard_ready"){
            connectToDashboard();
        }
		else if(event.data.command == "ping_players"){
			sendPong();
		}
		else if(event.data.command == "update_player"){
			if (event.data.hasOwnProperty("nickname") && event.data.hasOwnProperty("id") && event.data["id"] == playerId){
                value = event.data["nickname"];
                updateNicknameContent();
            }
		}
    });
}

function connectToDashboard(){
    broadcastChannel.postMessage({command: "connect_player", value: playerId});
}

function sendPong(){
    console.log("pong");
    broadcastChannel.postMessage({command: "pong_from_player", value: playerId});
}