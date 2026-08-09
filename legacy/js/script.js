console.log('Lets write JavaScript');
let currentSong = new Audio(); //creates a new HTML audio element instance. This Audio constructor returns an HTMLAudioElement that can play sound (just like <audio> in HTML). It starts with no source; the code will set currentSong.src later.
let songs = []; // songs in current folder 
let currFolder; // tracks the selected folder/album

// HELPER: Format seconds to 00:00
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`; //padstart helps to keep atleast 2 digits by adding leading zeros
}

// HELPER: Clean paths and handle URL decoding
const cleanPath = (path) => decodeURIComponent(path).replaceAll("\\", "/");

// this function loads a list of songs for a given folder (album) and updates the song list UI.
async function getSongs(folder) {
    currFolder = folder; // global variable updation so that it can be used in other functions
    try {
        let a = await fetch(`/${folder}/info.json`); //call retrieves a JSON file (presumably containing metadata) for that folder
        let response = await a.json(); //we use await to wait for the network response, then call.json()to parse it.
        songs = response.songs; 
    } catch (e) {
        // if fetch fails
        console.error("Error: Could not find songs in info.json", e);
        songs = [];
    }

    let songUL = document.querySelector(".songList ul");
    songUL.innerHTML = "";
    // he code selects the <ul> element for songs via document.querySelector(".songList ul") and clears it
    for (const song of songs) {
        // It then loops over each filename in songs. In each loop: song.replace(/\.mp3$/i, "") removes the .mp3 extension from the filename (case-insensitively, thanks to /i flag). This uses a regex literal /.mp3$/i that matches “.mp3” at the end of the string
        let songName = song.replace(/\.mp3$/i, ""); 
        songUL.innerHTML += `<li><img class="invert" width="34" src="img/music.svg" alt="">
        <div class="info">
            <div>${songName}</div>
            <div>Artist</div>
        </div>
        <div class="playnow">
            <span>Play Now</span>
            <img class="invert" src="img/play.svg" alt="">
        </div> </li>`;

        //adding song name and play now svg
    }

    Array.from(songUL.getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
        });

        /* After generating the <li> items, the code takes the HTMLCollection returned by songUL.getElementsByTagName("li") and converts it to an Array with Array.from(...). (HTMLCollections are array-like but not true arrays.) It then calls forEach on this array, adding a click listener to each <li>. The event function reads the clicked element’s song title via e.querySelector(".info").firstElementChild.innerHTML.trim() and calls playMusic with it. */
    });
    return songs;
    //returns the songs array (though this return is not used elsewhere, it just updates the global songs array
}

//Together, this sets up the audio source and optionally starts playing
const playMusic = (track, pause = false) => {
    let cleanTrack = track.replace(/\.mp3$/i, "").trim(); // removes mp3 extentions
    let actualFilename = songs.find(s => s.toLowerCase().includes(cleanTrack.toLowerCase())); //The .find() method returns the first matching element or undefined. Here we compare in lowercase to match case-insensitively.

    if (!actualFilename) {
        actualFilename = track.endsWith(".mp3") ? track : track + ".mp3";
    }

    currentSong.src = `/${currFolder}/` + encodeURI(actualFilename);
    //constructs the file path. It prepends the folder and slash, and encodes the filename viaencodeURI()
    
    if (!pause) {
        currentSong.play(); //html media element ka method hai -  returns a promise as well but we are not concerned about it 
        play.src = "img/pause.svg";
    }
    
    document.querySelector(".songinfo").innerHTML = actualFilename.replace(/\.mp3$/i, "");
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}


//This async function builds the album (card) UI by loading metadata for each folder and setting up clicks to switch albums.
async function displayAlbums() {
    let cardContainer = document.querySelector(".cardContainer");
    let albumFolders = [
        "ARIJIT", "DHH", "Diljit", "ENGLISH", "karan aujla", 
        "Love_(mood)", "PARTY", "Punjabi", "SATINDER SARTAJ", 
        "SHREYA", "SONU NIGAM"
    ]; 

    /* It loops over albumFolders. For each folder, it tries to fetch /songs/${folder}/info.json and parse it. On success it reads response.title and response.description. It then appends HTML into cardContainer.innerHTML to create a card <div>, embedding the folder name in data-folder. This block uses a template literal with backticks, which allows multi-line HTML and variable interpolation (${response.title} etc.). */

    for (const folder of albumFolders) {
        try {
            let a = await fetch(`/songs/${folder}/info.json`);
            let response = await a.json();
            cardContainer.innerHTML += `<div data-folder="${folder}" class="card">
                <div class="play">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                    </svg>
                </div>
                <img src="/songs/${folder}/cover.jpg" alt="">
                <h2>${response.title}</h2>
                <p>${response.description}</p>
            </div>`;
        } catch (error) {
            console.log("Error loading album info for:", folder);
        }
    }

    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async () => {
            songs = await getSongs(`songs/${e.dataset.folder}`);
            playMusic(songs[0]);
        });
    });

    /* After generating all cards, it grabs them by document.getElementsByClassName("card"), converts to an array, and attaches a click listener to each. The handler is async (because it calls getSongs which is async). It reads the folder name via e.dataset.folder (the custom data-folder attribute from the HTML). It then calls songs = await getSongs(\songs/${folder}`)to load that album’s songs, and immediately callsplayMusic(songs[0])` to play the first track. */
}

async function main() {
    // Initial Load
    await getSongs("songs/ARIJIT"); 
    playMusic(songs[0], true);
    await displayAlbums();

    /*This loads the “ARIJIT” album by default. The await ensures getSongs completes before proceeding. Then playMusic(songs[0], true) preloads the first song in that album but with pause = true so it does not start playing yet (it only sets source and UI). Then it calls displayAlbums() to build the album list. Using await on these async calls guarantees the DOM updates happen in order */

    // Play/Pause toggle
    play.addEventListener("click", () => {
        if (currentSong.paused) {  // boolean property of audio element
            currentSong.play(); 
            play.src = "img/pause.svg"; 
        } else { 
            currentSong.pause(); 
            play.src = "img/play.svg"; 
        }
    });

    // Time update for seekbar and display
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seekbar click to jump time
    //e.offsetX is the X-coordinate of the click relative to the target’s padding edge. We divide by the element’s width (from getBoundingClientRect()) to get a fraction, then multiply by 100 for a percentage. The circle is moved there visually, and we set currentSong.currentTime to the corresponding time (duration * fraction). This allows random access seeking.
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    });

    // Hamburger and Close for Mobile UI
    document.querySelector(".hamburger").addEventListener("click", () => { document.querySelector(".left").style.left = "0"; });
    document.querySelector(".close").addEventListener("click", () => { document.querySelector(".left").style.left = "-120%"; });

    // Next/Previous
    // The code updates the track to the previous or next in the list. It reads the current track name from the UI (.songinfo) and finds its index in songs using findIndex. If a valid neighbor exists, it calls playMusic on it. (findIndex works like find but returns the index of the first matching element or -1 if not found
    previous.addEventListener("click", () => {
        let currentTrackName = document.querySelector(".songinfo").innerHTML.trim();
        let index = songs.findIndex(s => s.toLowerCase().includes(currentTrackName.toLowerCase()));
        if (index - 1 >= 0) {
            playMusic(songs[index - 1]);
        }
    });

    next.addEventListener("click", () => {
        let currentTrackName = document.querySelector(".songinfo").innerHTML.trim();
        let index = songs.findIndex(s => s.toLowerCase().includes(currentTrackName.toLowerCase()));
        if (index + 1 < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    // Volume Slider
    // The volume property of HTMLMediaElement is a number 0–1, where 0 is muted and 1 is full volume.
    document.querySelector(".range input").addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
    });

    // Mute Toggle with Memory Functionality
    let lastVolume = 0.5; // Default memory set to 50%
    document.querySelector(".volume>img").addEventListener("click", (e) => {
        let rangeInput = document.querySelector(".range input");
        
        if (e.target.src.includes("volume.svg")) {
            // MUTING: Store current volume before setting to 0
            lastVolume = currentSong.volume; 
            currentSong.volume = 0;
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            rangeInput.value = 0;
        } else {
            // UNMUTING: Restore to lastVolume
            // If lastVolume was somehow 0, default to 0.1 so it's audible
            currentSong.volume = lastVolume > 0 ? lastVolume : 0.1; 
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            rangeInput.value = currentSong.volume * 100;
        }
    });
}

main();