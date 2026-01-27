console.log('Lets write JavaScript');
let currentSong = new Audio();
let songs = [];
let currFolder;

// HELPER: Format seconds to 00:00
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// HELPER: Clean paths and handle URL decoding
const cleanPath = (path) => decodeURIComponent(path).replaceAll("\\", "/");

async function getSongs(folder) {
    currFolder = folder;
    try {
        let a = await fetch(`/${folder}/info.json`);
        let response = await a.json();
        songs = response.songs; 
    } catch (e) {
        console.error("Error: Could not find songs in info.json", e);
        songs = [];
    }

    let songUL = document.querySelector(".songList ul");
    songUL.innerHTML = "";
    for (const song of songs) {
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
    }

    Array.from(songUL.getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", () => {
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
        });
    });
    return songs;
}

const playMusic = (track, pause = false) => {
    let cleanTrack = track.replace(/\.mp3$/i, "").trim();
    let actualFilename = songs.find(s => s.toLowerCase().includes(cleanTrack.toLowerCase()));

    if (!actualFilename) {
        actualFilename = track.endsWith(".mp3") ? track : track + ".mp3";
    }

    currentSong.src = `/${currFolder}/` + encodeURI(actualFilename);
    
    if (!pause) {
        currentSong.play();
        play.src = "img/pause.svg";
    }
    
    document.querySelector(".songinfo").innerHTML = actualFilename.replace(/\.mp3$/i, "");
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
}

async function displayAlbums() {
    let cardContainer = document.querySelector(".cardContainer");
    let albumFolders = [
        "ARIJIT", "DHH", "Diljit", "ENGLISH", "karan aujla", 
        "Love_(mood)", "PARTY", "Punjabi", "SATINDER SARTAJ", 
        "SHREYA", "SONU NIGAM"
    ]; 

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
}

async function main() {
    // Initial Load
    await getSongs("songs/ARIJIT"); 
    playMusic(songs[0], true);
    await displayAlbums();

    // Play/Pause toggle
    play.addEventListener("click", () => {
        if (currentSong.paused) { 
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
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    });

    // Hamburger and Close for Mobile UI
    document.querySelector(".hamburger").addEventListener("click", () => { document.querySelector(".left").style.left = "0"; });
    document.querySelector(".close").addEventListener("click", () => { document.querySelector(".left").style.left = "-120%"; });

    // Next/Previous
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