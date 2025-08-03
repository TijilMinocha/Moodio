console.log('Lets write JavaScript');
let currentSong = new Audio(); //playing audio in js - new audio element in html
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0'); // to convert single digits to 0-digit eg 1 -> 01
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}


// getting songs href link by fetching in the anchor tag
async function getSongs(folder) {
    currFolder = folder;
    let a = await fetch(`/${folder}/`) //each a tag refers to sub folder of songs folder
    let response = await a.text();
    let div = document.createElement("div")
    div.innerHTML = response; // inserting the fetch api response to the div
    let as = div.getElementsByTagName("a")
    songs = []
    for (let index = 0; index < as.length; index++) { // collecting all links(anchor tags) filtering them by mp3 format and pushing into the songs array
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1])
        }
    }



    // Show all the songs in the queue
    let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0]
    songUL.innerHTML = "" //
    for (const song of songs) {
        let songName = decodeURIComponent(song).replace(/\.mp3$/i, ""); // clean name
        songUL.innerHTML += `<li><img class="invert" width="34" src="img/music.svg" alt="">
        <div class="info">
            <div>${songName}</div>
            <div>Harry</div>
        </div>
        <div class="playnow">
            <span>Play Now</span>
            <img class="invert" src="img/play.svg" alt="">
        </div> </li>`;
    }

    // Attach an event listener to each song - play song on clicking the song card in the queue
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", element => {
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim()) //

        })
    })

    return songs
}

const playMusic = (track, pause = false) => {
    currentSong.src = `/${currFolder}/` + track
    if (!pause) {
        currentSong.play() 
        play.src = "img/pause.svg"
    }
    if (track) {
        document.querySelector(".songinfo").innerHTML = decodeURIComponent(track).replace(/\.mp3$/i, "");
    } else {
        document.querySelector(".songinfo").innerHTML = "No Song Playing";
    }


    document.querySelector(".songtime").innerHTML = "00:00 / 00:00"


}


//creating playlists card based on subfolders - parses the song folder - extracts all subfolders - extracts json files, card_image - updates the inner html of each card
async function displayAlbums() {
    console.log("displaying albums")
    let a = await fetch(`/songs/`)
    let response = await a.text();
    let div = document.createElement("div")
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a")
    let cardContainer = document.querySelector(".cardContainer")
    let array = Array.from(anchors)
    for (let index = 0; index < array.length; index++) {
        const e = array[index];
        if (e.href.includes("/songs") && !e.href.includes(".htaccess")) {
            let folder = e.href.split("/").slice(-2)[0]
            // Get the metadata of the folder
            let a = await fetch(`/songs/${folder}/info.json`)
            let response = await a.json();
            cardContainer.innerHTML = cardContainer.innerHTML + ` <div data-folder="${folder}" class="card">
            <div class="play">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                        stroke-linejoin="round" />
                </svg>
            </div>

            <img src="/songs/${folder}/cover.jpg" alt="">
            <h2>${response.title}</h2>
            <p>${response.description}</p>
        </div>`
        }
    }

    // Load the playlist whenever card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            console.log("Fetching Songs")
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`) // - gets the songs from playlists folder - into the songs array
            playMusic(songs[0]) // starts playing the first song

        })
    })
}

async function main() {
    // Get the list of all the songs
    await getSongs("songs/ncs")
    playMusic(songs[0], true) // first song setup but with pause to load rest of the ui

    // Display all the albums on the page
    await displayAlbums()


    // Attach an event listener to play, next and previous
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
            play.src = "img/pause.svg"
        }
        else {
            currentSong.pause()
            play.src = "img/play.svg"
        }
    })

    // Listen for timeupdate event
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%"; // - moving the seekbar circle by changing its position from left - based on the percentage of song played
    })

    // Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100; //
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100
    })

    // Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

    // Add an event listener to previous
    previous.addEventListener("click", () => {
        currentSong.pause() // pause the current song
        console.log("Previous clicked")
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1])
        }
    })

    // Add an event listener to next
    next.addEventListener("click", () => {
        currentSong.pause()
        console.log("Next clicked")

        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1])
        }
    })

    let previousVolume = 1; // Default full volume (1 = 100%)

    document.querySelector(".range input").addEventListener("change", (e) => {
        const newVolume = parseInt(e.target.value) / 100; // value lies between 0 & 1
        console.log("Setting volume to", e.target.value, "/ 100");
        currentSong.volume = newVolume;

        if (newVolume > 0) {
            previousVolume = newVolume; // Update saved volume
            document.querySelector(".volume>img").src =
                document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg");
        }
    });

    // Mute/Unmute toggle
    document.querySelector(".volume>img").addEventListener("click", (e) => {
        const volumeIcon = document.querySelector(".volume>img");
        const rangeInput = document.querySelector(".range input");

        if (e.target.src.includes("volume.svg")) {
            // Save current volume before muting
            previousVolume = currentSong.volume || 0.5;
            currentSong.volume = 0;
            rangeInput.value = 0;
            volumeIcon.src = volumeIcon.src.replace("volume.svg", "mute.svg");
        } else {
            // Restore previous volume on unmute
            currentSong.volume = previousVolume;
            rangeInput.value = previousVolume * 100;
            volumeIcon.src = volumeIcon.src.replace("mute.svg", "volume.svg");
        }
    });






}

main() 