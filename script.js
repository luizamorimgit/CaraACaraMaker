// ==========================================
// CONFIGURAÇÃO DO SERVIDOR
// ==========================================

const SERVER_URL =
    "wss://cara-a-cara-marker-server.onrender.com/ws/";

let socket = null;
let connectionTimeout = null;

let roomCode = "";
let playerNumber = null;

// ==========================================
// PAINEL DE DIAGNÓSTICO TEMPORÁRIO
// ==========================================
function ccmDebug(message, detail = "") {
    const text = "[CCM] " + message + (detail !== "" ? " | " + detail : "");
    console.log(text);
    let panel = document.getElementById("ccmDebugPanel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "ccmDebugPanel";
        panel.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:999999;max-height:45vh;overflow:auto;padding:10px;background:#111;color:#fff;font:12px monospace;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.35);";
        const header = document.createElement("div");
        header.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;position:sticky;top:0;background:#111;";
        const title = document.createElement("strong"); title.textContent = "DIAGNÓSTICO CCM";
        const clearButton = document.createElement("button"); clearButton.textContent = "LIMPAR";
        clearButton.style.cssText = "border:0;border-radius:6px;padding:4px 8px;font:inherit;cursor:pointer;";
        clearButton.addEventListener("click", function () { panel.querySelectorAll(".ccm-debug-line").forEach(function (line) { line.remove(); }); });
        header.appendChild(title); header.appendChild(clearButton); panel.appendChild(header); document.body.appendChild(panel);
    }
    const line = document.createElement("div"); line.className = "ccm-debug-line"; line.textContent = text; line.style.marginBottom = "3px";
    panel.appendChild(line); panel.scrollTop = panel.scrollHeight;
}
window.ccmDebug = ccmDebug;
window.addEventListener("error", function (event) { ccmDebug("ERRO JS", event.message + " @ linha " + event.lineno); });
window.addEventListener("unhandledrejection", function (event) { ccmDebug("PROMISE", String(event.reason)); });

let socketGeneration = 0;

let retryTimer = null;


// ==========================================
// CONFIGURAÇÃO DA PARTIDA - v3.0
// ==========================================

let winsToFinish = 1;

let matchConfigConfirmed = false;

let player1Score = 0;
let player2Score = 0;

let creatingAnimationTimer = null;
let creatingAnimationIndex = 0;

// Modo da tela de configuração:
// "create" = criar uma sala nova
// "change" = alterar a configuração da sala atual
let matchConfigMode = "create";
let matchConfigController = null;


// ==========================================
// ELEMENTOS
// ==========================================

const screens =
    document.querySelectorAll(".screen");

const lobby =
    document.getElementById("lobby");

const matchConfig =
    document.getElementById("matchConfig");

const joinRoomScreen =
    document.getElementById("joinRoom");

const waitingRoom =
    document.getElementById("waitingRoom");

const setup =
    document.getElementById("setup");

const joinRoomCode =
    document.getElementById("joinRoomCode");

const waitingCode =
    document.getElementById("waitingCode");

const playersList =
    document.getElementById("playersList");

const waitingMessage =
    document.getElementById("waitingMessage");

const playerTitle =
    document.getElementById("playerTitle");

const imageGrid =
    document.getElementById("imageGrid");

const gamePopup =
    document.getElementById("gamePopup");

const popupBoard =
    document.getElementById("popupBoard");

const matchScore =
    document.getElementById("matchScore");


// ==========================================
// TROCAR DE TELA
// ==========================================

function showScreen(screen) {

    if (window.ccmDebug) {
        window.ccmDebug("TROCANDO TELA", screen ? (screen.id || "sem-id") : "TELA NULA");
    }

    if (!screen) {
        return;
    }

    screens.forEach(function (item) {
        item.classList.remove("active");
    });

    screen.classList.add("active");
}


// ==========================================
// INSTALAÇÃO DO APP
// ==========================================

let deferredPrompt = null;

const installButton =
    document.getElementById("installButton");

function hideInstallButtonIfInstalled() {

    const isInstalled =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true;

    if (isInstalled && installButton) {
        installButton.hidden = true;
    }
}

hideInstallButtonIfInstalled();

window.addEventListener(
    "beforeinstallprompt",
    function (event) {

        event.preventDefault();

        deferredPrompt = event;
    }
);

installButton?.addEventListener(
    "click",
    async function () {

        if (!deferredPrompt) {

            openPopup(
                "INSTALAÇÃO INDISPONÍVEL",
                "A INSTALAÇÃO DO APP NÃO ESTÁ DISPONÍVEL NESTE DISPOSITIVO OU NAVEGADOR.",
                null,
                "OK"
            );

            return;
        }

        deferredPrompt.prompt();

        await deferredPrompt.userChoice;

        deferredPrompt = null;
    }
);

window.addEventListener(
    "appinstalled",
    function () {

        deferredPrompt = null;

        if (installButton) {
            installButton.hidden = true;
        }
    }
);


// ==========================================
// ANIMAÇÃO "CRIANDO..."
// ==========================================

function startCreatingAnimation(button) {

    stopCreatingAnimation();

    if (!button) {
        return;
    }

    creatingAnimationIndex = 0;

    const states = [
        "CRIANDO",
        "CRIANDO.",
        "CRIANDO..",
        "CRIANDO..."
    ];

    button.textContent =
        states[0];

    creatingAnimationTimer =
        setInterval(
            function () {

                creatingAnimationIndex =
                    (creatingAnimationIndex + 1) %
                    states.length;

                button.textContent =
                    states[
                        creatingAnimationIndex
                    ];

            },
            400
        );
}


// ==========================================
// PARAR ANIMAÇÃO "CRIANDO..."
// ==========================================

function stopCreatingAnimation() {

    if (creatingAnimationTimer) {

        clearInterval(
            creatingAnimationTimer
        );

        creatingAnimationTimer =
            null;
    }

    creatingAnimationIndex =
        0;
}


// ==========================================
// CONFIGURAÇÃO DA PARTIDA
// ==========================================

function openMatchConfig(
    mode = "create",
    controller = null
) {

    matchConfigMode =
        mode === "change"
            ? "change"
            : "create";

    matchConfigController =
        matchConfigMode === "change"
            ? Number(controller)
            : null;

    if (matchConfigMode === "create") {
        winsToFinish = 1;
    }

    matchConfigConfirmed = false;

    updateWinsSelector();

    const createButton =
        document.getElementById(
            "createRoomButton"
        );

    if (createButton) {

        if (matchConfigMode === "change") {

            createButton.textContent =
                "CONFIRMAR";

            const canConfirm =
                !matchConfigController ||
                Number(playerNumber) ===
                    matchConfigController;

            createButton.disabled =
                !canConfirm;

        } else {

            createButton.textContent =
                "CRIAR SALA";

            createButton.disabled =
                false;
        }
    }

    showScreen(
        matchConfig
    );
}


// ==========================================
// CONFIRMAR CONFIGURAÇÃO
// ==========================================

function confirmMatchConfig() {

    if (matchConfigMode === "change") {

        if (
            matchConfigController &&
            Number(playerNumber) !==
                matchConfigController
        ) {
            return;
        }

        matchConfigConfirmed = true;

        const button =
            document.getElementById(
                "createRoomButton"
            );

        if (button) {
            button.disabled = true;
            button.textContent = "SALVANDO...";
        }

        if (typeof showWaitingOverlay === "function") {
            showWaitingOverlay(
                "CONFIGURAÇÃO",
                "Aplicando a nova configuração..."
            );
        }

        if (typeof sendGameMessage === "function") {
            sendGameMessage({
                type: "set_match_config",
                wins_to_finish: winsToFinish
            });
        }

        return;
    }

    matchConfigConfirmed = true;

    createRoom();
}


// ==========================================
// ESCOLHER QUANTIDADE DE VITÓRIAS
// ==========================================

const MATCH_WINS_OPTIONS = [
    1,
    3,
    5,
    7
];


function updateWinsSelector() {

    const valueElement =
        document.getElementById(
            "winsValue"
        );

    const decreaseButton =
        document.getElementById(
            "winsDecrease"
        );

    const increaseButton =
        document.getElementById(
            "winsIncrease"
        );

    const currentIndex =
        MATCH_WINS_OPTIONS.indexOf(
            Number(winsToFinish)
        );

    if (valueElement) {

        valueElement.textContent =
            winsToFinish;
    }

    if (decreaseButton) {

        decreaseButton.disabled =
            currentIndex <= 0;
    }

    if (increaseButton) {

        increaseButton.disabled =
            currentIndex >=
            MATCH_WINS_OPTIONS.length - 1;
    }
}


function changeWins(direction) {

    const currentIndex =
        MATCH_WINS_OPTIONS.indexOf(
            Number(winsToFinish)
        );

    if (currentIndex === -1) {

        winsToFinish = 1;
        updateWinsSelector();

        return;
    }

    const nextIndex =
        currentIndex + direction;

    if (
        nextIndex < 0 ||
        nextIndex >= MATCH_WINS_OPTIONS.length
    ) {
        return;
    }

    winsToFinish =
        MATCH_WINS_OPTIONS[nextIndex];

    updateWinsSelector();
}


const winsDecreaseButton =
    document.getElementById(
        "winsDecrease"
    );

const winsIncreaseButton =
    document.getElementById(
        "winsIncrease"
    );


winsDecreaseButton?.addEventListener(
    "click",
    function () {
        changeWins(-1);
    }
);


winsIncreaseButton?.addEventListener(
    "click",
    function () {
        changeWins(1);
    }
);


updateWinsSelector();


// ==========================================
// VOLTAR DA CONFIGURAÇÃO PARA O LOBBY
// ==========================================

function backToLobby() {

    if (matchConfigMode === "change" && Number(playerNumber) !== 1) {
        return;
    }

    stopCreatingAnimation();

    matchConfigConfirmed = false;

    matchConfigMode = "create";
    matchConfigController = null;

    winsToFinish = 1;

    resetMatchScore();

    resetRoomButtons();

    showScreen(
        lobby
    );
}


// ==========================================
// ATUALIZAR PLACAR
// ==========================================

function updateMatchScore(
    score1,
    score2
) {

    const parsedScore1 =
        Number(score1);

    const parsedScore2 =
        Number(score2);

    if (
        Number.isFinite(parsedScore1)
    ) {

        player1Score =
            parsedScore1;
    }

    if (
        Number.isFinite(parsedScore2)
    ) {

        player2Score =
            parsedScore2;
    }

    if (matchScore) {

        matchScore.textContent =
            `J1 — ${player1Score} × ${player2Score} — J2`;
    }
}


// ==========================================
// RESETAR PLACAR
// ==========================================

function resetMatchScore() {

    player1Score =
        0;

    player2Score =
        0;

    updateMatchScore(
        0,
        0
    );
}


// ==========================================
// RESETAR BOTÕES
// ==========================================

function resetRoomButtons() {

    stopCreatingAnimation();


    const createLobbyButton =
        document.querySelector(
            '#lobby button[onclick="openMatchConfig()"]'
        );

    if (createLobbyButton) {

        createLobbyButton.textContent =
            "CRIAR SALA";

        createLobbyButton.disabled =
            false;
    }


    const createButton =
        document.querySelector(
            '#matchConfig button[onclick="confirmMatchConfig()"]'
        );

    if (createButton) {

        createButton.textContent =
            "CRIAR SALA";

        createButton.disabled =
            false;
    }


    const joinRoomButton =
        document.querySelector(
            '#lobby button[onclick="showJoinRoom()"]'
        );

    if (joinRoomButton) {

        joinRoomButton.textContent =
            "ENTRAR EM SALA";

        joinRoomButton.disabled =
            false;
    }


    const joinButton =
        document.getElementById(
            "joinButton"
        );

    if (joinButton) {

        joinButton.textContent =
            "ENTRAR";

        joinButton.disabled =
            false;
    }
}


// ==========================================
// TEMA DO JOGADOR
// ==========================================

function applyPlayerTheme() {

    document.body.classList.remove(
        "player-1-theme",
        "player-2-theme"
    );

    if (playerNumber === 1) {

        document.body.classList.add(
            "player-1-theme"
        );

    } else if (playerNumber === 2) {

        document.body.classList.add(
            "player-2-theme"
        );
    }
}


// ==========================================
// TEMA ESCURO
// ==========================================

const themeToggle =
    document.getElementById("themeToggle");

if (themeToggle) {

    themeToggle.addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "dark"
            );

            if (
                document.body.classList.contains(
                    "dark"
                )
            ) {

                themeToggle.textContent =
                    "☾";

            } else {

                themeToggle.textContent =
                    "☀";
            }
        }
    );
}


// ==========================================
// VOLTAR PARA O LOBBY
// ==========================================

function backToRoomChoice() {

    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        leaveRoom();

    } else {

        if (connectionTimeout) {

            clearTimeout(
                connectionTimeout
            );

            connectionTimeout =
                null;
        }

        if (retryTimer) {

            clearTimeout(
                retryTimer
            );

            retryTimer =
                null;
        }

        stopCreatingAnimation();

        roomCode =
            "";

        playerNumber =
            null;

        matchConfigConfirmed =
            false;

        winsToFinish =
            1;

        resetMatchScore();

        resetRoomButtons();

        showScreen(
            lobby
        );
    }
}


// ==========================================
// GERAR CÓDIGO DA SALA
// ==========================================

function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code =
        "";

    for (
        let i = 0;
        i < 4;
        i++
    ) {

        code +=
            characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );
    }

    return code;
}


// ==========================================
// CRIAR SALA
// ==========================================

function createRoom() {

    if (!matchConfigConfirmed) {

        openMatchConfig();

        return;
    }


    const button =
        document.querySelector(
            '#matchConfig button[onclick="confirmMatchConfig()"]'
        );


    if (connectionTimeout) {

        clearTimeout(
            connectionTimeout
        );

        connectionTimeout =
            null;
    }


    if (retryTimer) {

        clearTimeout(
            retryTimer
        );

        retryTimer =
            null;
    }


    if (socket) {

        try {
            socket.close();
        } catch (error) {}

        socket =
            null;
    }


    if (button) {

        button.disabled =
            true;

        startCreatingAnimation(
            button
        );
    }


    resetMatchScore();


    const code =
        generateRoomCode();

    roomCode =
        code;


    connectToRoom(
        code,
        "create"
    );
}


// ==========================================
// MOSTRAR TELA DE ENTRAR
// ==========================================

function showJoinRoom() {

    resetRoomButtons();

    joinRoomCode.value =
        "";

    showScreen(
        joinRoomScreen
    );

    setTimeout(
        function () {

            joinRoomCode.focus();

        },
        50
    );
}


// ==========================================
// INPUT DO CÓDIGO
// ==========================================

if (joinRoomCode) {

    joinRoomCode.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .toUpperCase()
                    .replace(
                        /[^A-Z0-9]/g,
                        ""
                    )
                    .slice(
                        0,
                        4
                    );
        }
    );
}


// ==========================================
// ENTRAR NA SALA
// ==========================================

function joinRoom() {

    const code =
        joinRoomCode.value
            .trim()
            .toUpperCase();


    if (code.length !== 4) {

        openPopup(
            "CÓDIGO INVÁLIDO",
            "POR FAVOR, DIGITE UM CÓDIGO DE 4 CARACTERES.",
            null,
            "OK"
        );

        return;
    }


    const button =
        document.getElementById(
            "joinButton"
        );


    if (button) {

        button.textContent =
            "ENTRANDO...";

        button.disabled =
            true;
    }


    roomCode =
        code;


    connectToRoom(
        code,
        "join"
    );
}


// ==========================================
// CONECTAR AO SERVIDOR
// ==========================================

function connectToRoom(
    code,
    action
) {

    if (window.ccmDebug) {
        window.ccmDebug("CONECTANDO", "sala=" + code + " ação=" + action);
    }

    if (connectionTimeout) {

        clearTimeout(
            connectionTimeout
        );

        connectionTimeout =
            null;
    }


    socketGeneration++;

    const currentGeneration =
        socketGeneration;


    if (socket) {

        try {
            socket.close();
        } catch (error) {}

        socket =
            null;
    }


    const url =
        SERVER_URL +
        encodeURIComponent(code) +
        "/" +
        action;


    console.log(
        "Tentando conectar:",
        url
    );


    pageExitNotified = false;

    const newSocket =
        new WebSocket(url);


    socket =
        newSocket;


    connectionTimeout =
        setTimeout(
            function () {

                if (
                    socket === newSocket &&
                    socketGeneration === currentGeneration &&
                    newSocket.readyState === WebSocket.CONNECTING
                ) {

                    console.log(
                        "Servidor demorou. Tentando novamente..."
                    );


                    try {
                        newSocket.close();
                    } catch (error) {}


                    socket =
                        null;


                    retryTimer =
                        setTimeout(
                            function () {

                                retryTimer =
                                    null;

                                connectToRoom(
                                    code,
                                    action
                                );

                            },
                            1500
                        );
                }

                connectionTimeout =
                    null;

            },
            5000
        );


    newSocket.onopen =
        function () {
            if (window.ccmDebug) {
                window.ccmDebug("WEBSOCKET ABERTO", "sala=" + code + " ação=" + action);
            }

            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            console.log(
                "WebSocket conectado!"
            );

            console.log(
                "Sala:",
                code
            );

            console.log(
                "Ação:",
                action
            );


            if (connectionTimeout) {

                clearTimeout(
                    connectionTimeout
                );

                connectionTimeout =
                    null;
            }


            // ==================================
            // CONFIGURAÇÃO DA PARTIDA
            // ==================================

            if (
                action === "create"
            ) {

                const validWins =
                    MATCH_WINS_OPTIONS;


                if (
                    !validWins.includes(
                        Number(winsToFinish)
                    )
                ) {

                    winsToFinish =
                        1;
                }


                try {

                    newSocket.send(
                        JSON.stringify({
                            type: "set_match_config",
                            wins_to_finish:
                                winsToFinish
                        })
                    );

                    console.log(
                        "Configuração enviada:",
                        winsToFinish,
                        "vitória(s)"
                    );

                } catch (error) {

                    console.error(
                        "Erro ao enviar configuração da partida:",
                        error
                    );
                }
            }


            // ==================================
            // TEMPO MÁXIMO DE SEGURANÇA
            // ==================================
            //
            // Se o WebSocket conectar, mas o
            // servidor não responder com uma
            // mensagem válida, não deixamos
            // "CRIANDO..." preso para sempre.
            // ==================================

            connectionTimeout =
                setTimeout(
                    function () {

                        if (
                            socket !== newSocket ||
                            socketGeneration !== currentGeneration
                        ) {
                            return;
                        }


                        console.log(
                            "Servidor conectado, mas não respondeu a tempo."
                        );


                        stopCreatingAnimation();


                        if (newSocket.readyState === WebSocket.OPEN) {

                            try {

                                newSocket.close();

                            } catch (error) {}
                        }


                        socket =
                            null;


                        resetRoomButtons();


                        openPopup(
                            "CONEXÃO DEMOROU",
                            "O SERVIDOR DEMOROU DEMAIS PARA RESPONDER. TENTE NOVAMENTE.",
                            null,
                            "OK"
                        );

                    },
                    10000
                );
        };


    newSocket.onmessage =
        function (event) {

            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            console.log(
                "Mensagem do servidor:",
                event.data
            );


            let data;


            try {

                data =
                    JSON.parse(
                        event.data
                    );

                if (window.ccmDebug) {
                    window.ccmDebug("SERVIDOR → CLIENTE", data.type || "SEM TIPO");
                }

            } catch (error) {

                console.error(
                    "Mensagem inválida:",
                    event.data
                );

                return;
            }


            handleServerMessage(
                data
            );
        };


    newSocket.onerror =
        function (error) {
            if (window.ccmDebug) {
                window.ccmDebug("WEBSOCKET ERRO", "readyState=" + newSocket.readyState);
            }

            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            console.error(
                "ERRO NO WEBSOCKET:",
                error
            );

            // O onclose fará o tratamento final.
            // Não paramos "CRIANDO..." aqui, pois ainda pode haver
            // uma tentativa/reconexão em andamento.
        };


    newSocket.onclose =
        function (event) {
            if (window.ccmDebug) {
                window.ccmDebug("WEBSOCKET FECHADO", "código=" + event.code + " motivo=" + (event.reason || "-"));
            }

            console.log(
                "WebSocket fechado."
            );

            console.log(
                "Código:",
                event.code
            );

            console.log(
                "Motivo:",
                event.reason
            );


            if (
                socket !== newSocket ||
                socketGeneration !== currentGeneration
            ) {
                return;
            }


            socket =
                null;


            if (connectionTimeout) {

                clearTimeout(
                    connectionTimeout
                );

                connectionTimeout =
                    null;
            }


            const waitingForRoomConnection =
                matchConfig.classList.contains("active") ||
                joinRoomScreen.classList.contains("active");


            if (waitingForRoomConnection) {

                resetRoomButtons();

                openPopup(
                    "CONEXÃO PERDIDA",
                    "NÃO FOI POSSÍVEL CONECTAR AO SERVIDOR. TENTE NOVAMENTE.",
                    null,
                    "OK"
                );
            }
        };
}


// ==========================================
// MENSAGENS DO SERVIDOR
// ==========================================

function handleServerMessage(data) {

    if (window.ccmDebug) {
        window.ccmDebug("handleServerMessage", data && data.type ? data.type : "SEM TIPO");
    }

    if (!data || !data.type) {
        return;
    }


    // ======================================
    // CONFIGURAÇÃO DA PARTIDA
    // ======================================

    if (
        data.type === "match_config"
    ) {

        const configuredWins =
            Number(
                data.wins_to_finish
            );


        if (
            MATCH_WINS_OPTIONS.includes(
                configuredWins
            )
        ) {

            winsToFinish =
                configuredWins;
        }


        if (data.score) {

            updateMatchScore(
                data.score[1] ??
                    data.score["1"] ??
                    0,

                data.score[2] ??
                    data.score["2"] ??
                    0
            );
        }


        updateWinsSelector();


        console.log(
            "Partida configurada para:",
            winsToFinish,
            "vitória(s)"
        );


        if (matchConfigMode === "change") {

            if (typeof handleGameMessage === "function") {
                handleGameMessage(data);
            }

            return;
        }


        return;
    }


    // ======================================
    // ATUALIZAÇÃO DO PLACAR
    // ======================================

    if (
        data.type === "score_update"
    ) {

        if (data.score) {

            updateMatchScore(
                data.score[1] ??
                    data.score["1"] ??
                    0,

                data.score[2] ??
                    data.score["2"] ??
                    0
            );

        } else {

            updateMatchScore(
                data.player1_score ??
                    player1Score,

                data.player2_score ??
                    player2Score
            );
        }

        if (typeof handleGameMessage === "function") {
            handleGameMessage(data);
        }

        return;
    }


    // ======================================
    // PARTIDA VENCIDA
    // ======================================

    if (
        data.type === "match_won"
    ) {

        updateMatchScore(
            data.score?.[1] ??
                data.score?.["1"] ??
                data.player1_score ??
                player1Score,

            data.score?.[2] ??
                data.score?.["2"] ??
                data.player2_score ??
                player2Score
        );

        if (typeof handleGameMessage === "function") {
            handleGameMessage(data);
        }

        return;
    }


    // ======================================
    // JOGADOR ENTROU
    // ======================================

    if (data.type === "joined") {

        // O servidor respondeu corretamente.
        // Podemos cancelar o limite de segurança.
        if (connectionTimeout) {

            clearTimeout(
                connectionTimeout
            );

            connectionTimeout =
                null;
        }


        playerNumber =
            data.player;

        applyPlayerTheme();


        playerTitle.textContent =
            "JOGADOR " +
            playerNumber;


        waitingCode.textContent =
            roomCode;


        waitingMessage.textContent =
            "AGUARDANDO OUTRO JOGADOR...";


        showScreen(
            waitingRoom
        );


        stopCreatingAnimation();

        matchConfigMode = "create";
        matchConfigController = null;

        return;
    }


    // ======================================
    // JOGADORES
    // ======================================

    if (data.type === "players") {

        updatePlayersList(
            Array.isArray(data.players)
                ? data.players
                : []
        );


        const players =
            Array.isArray(data.players)
                ? data.players
                : [];


        if (players.length === 1) {

            waitingMessage.textContent =
                "AGUARDANDO OUTRO JOGADOR...";
        }


        if (players.length === 2) {
            if (window.ccmDebug) {
                window.ccmDebug("2 JOGADORES", "abrindo setup");
            }

            waitingMessage.textContent =
                "OS DOIS JOGADORES ESTÃO NA SALA!";


            if (
                waitingRoom.classList.contains(
                    "active"
                )
            ) {

                openSetup();
            }
        }


        return;
    }


    // ======================================
    // JOGADOR SAIU
    // ======================================

    if (data.type === "player_left") {

        const leavingPlayer =
            data.player || "?";


        const remainingPlayers =
            Array.isArray(data.players)
                ? data.players
                : [];


        updatePlayersList(
            remainingPlayers
        );


        waitingMessage.textContent =
            "AGUARDANDO OUTRO JOGADOR...";


        if (
            setup.classList.contains(
                "active"
            ) ||
            (
                typeof characterChoiceScreen !==
                "undefined" &&
                characterChoiceScreen &&
                characterChoiceScreen.classList.contains(
                    "active"
                )
            ) ||
            (
                typeof gameScreen !==
                "undefined" &&
                gameScreen &&
                gameScreen.classList.contains(
                    "active"
                )
            )
        ) {

            if (
                typeof resetAllGameVariables ===
                "function"
            ) {

                resetAllGameVariables();
            }


            resetMatchScore();


            showScreen(
                waitingRoom
            );
        }


        openPopup(
            "JOGADOR SAIU",
            "JOGADOR " +
            leavingPlayer +
            " SAIU DA SALA.",
            null,
            "OK"
        );


        return;
    }


    // ======================================
    // SALA NÃO EXISTE
    // ======================================

    if (data.type === "room_not_found") {

        stopCreatingAnimation();


        if (connectionTimeout) {

            clearTimeout(
                connectionTimeout
            );

            connectionTimeout =
                null;
        }


        if (socket) {

            try {
                socket.close();
            } catch (error) {}

            socket =
                null;
        }


        resetRoomButtons();


        openPopup(
            "SALA NÃO EXISTE",
            "NÃO FOI ENCONTRADA NENHUMA SALA COM ESSE CÓDIGO.",
            function () {

                showScreen(
                    joinRoomScreen
                );


                setTimeout(
                    function () {

                        joinRoomCode.focus();

                    },
                    50
                );
            },
            "OK"
        );


        return;
    }


    // ======================================
    // CÓDIGO DA SALA JÁ EXISTE
    // ======================================

    if (data.type === "room_exists") {

        if (connectionTimeout) {

            clearTimeout(
                connectionTimeout
            );

            connectionTimeout =
                null;
        }


        if (socket) {

            try {
                socket.close();
            } catch (error) {}

            socket =
                null;
        }


        roomCode =
            generateRoomCode();


        connectToRoom(
            roomCode,
            "create"
        );


        return;
    }


    // ======================================
    // SALA CHEIA
    // ======================================

    if (data.type === "room_full") {

        stopCreatingAnimation();


        if (connectionTimeout) {

            clearTimeout(
                connectionTimeout
            );

            connectionTimeout =
                null;
        }


        if (socket) {

            try {
                socket.close();
            } catch (error) {}

            socket =
                null;
        }


        resetRoomButtons();


        openPopup(
            "SALA CHEIA",
            "ESSA SALA JÁ TEM 2 JOGADORES.",
            function () {

                showScreen(
                    joinRoomScreen
                );

                joinRoomCode.focus();

            },
            "OK"
        );


        return;
    }


    // ======================================
    // AÇÃO INVÁLIDA
    // ======================================

    if (data.type === "invalid_action") {

        stopCreatingAnimation();


        if (connectionTimeout) {

            clearTimeout(
                connectionTimeout
            );

            connectionTimeout =
                null;
        }


        if (socket) {

            try {
                socket.close();
            } catch (error) {}

            socket =
                null;
        }


        resetRoomButtons();


        openPopup(
            "ERRO",
            "NÃO FOI POSSÍVEL REALIZAR ESSA AÇÃO.",
            function () {

                showScreen(
                    lobby
                );
            },
            "OK"
        );


        return;
    }


    // ======================================
    // CHAT
    // ======================================

    if (data.type === "chat_message") {

        if (
            typeof window.handleChatMessage ===
            "function"
        ) {
            window.handleChatMessage(data);
        }

        return;
    }


    // ======================================
    // MENSAGENS DO JOGO
    // ======================================

    if (
        typeof handleGameMessage ===
        "function"
    ) {

        handleGameMessage(
            data
        );
    }
}


// ==========================================
// AVISAR SAÍDA AO ATUALIZAR/FECHAR A PÁGINA
// ==========================================
//
// Quando o jogador atualiza a página, o botão
// de sair não é executado. Enviamos leave_room
// enquanto o WebSocket ainda está aberto para que
// o servidor avise imediatamente o outro jogador.
// ==========================================

let pageExitNotified = false;

function notifyPageExit() {

    if (pageExitNotified) {
        return;
    }

    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        pageExitNotified = true;

        try {
            socket.send(
                JSON.stringify({
                    type: "leave_room"
                })
            );
        } catch (error) {
            console.error(
                "Erro ao avisar saída da página:",
                error
            );
        }
    }
}

window.addEventListener(
    "pagehide",
    notifyPageExit
);


// ==========================================
// LISTA DE JOGADORES
// ==========================================

function updatePlayersList(players) {

    if (!playersList) {
        return;
    }


    playersList.innerHTML =
        "";


    if (!Array.isArray(players)) {
        return;
    }


    players
        .sort(function (a, b) {
            return a - b;
        })
        .forEach(
            function (number) {

                const player =
                    document.createElement(
                        "div"
                    );


                player.className =
                    "player-card";


                const color =
                    document.createElement(
                        "div"
                    );


                color.className =
                    "player-color " +
                    (
                        number === 1
                            ? "blue"
                            : "red"
                    );


                const name =
                    document.createElement(
                        "span"
                    );


                name.textContent =
                    "JOGADOR " +
                    number;


                const status =
                    document.createElement(
                        "span"
                    );


                status.className =
                    "status";


                status.textContent =
                    "CONECTADO";


                player.appendChild(
                    color
                );


                player.appendChild(
                    name
                );


                player.appendChild(
                    status
                );


                playersList.appendChild(
                    player
                );
            }
        );
}


// ==========================================
// SAIR DA SALA
// ==========================================

function leaveRoom() {

    if (connectionTimeout) {

        clearTimeout(
            connectionTimeout
        );

        connectionTimeout =
            null;
    }


    if (retryTimer) {

        clearTimeout(
            retryTimer
        );

        retryTimer =
            null;
    }


    stopCreatingAnimation();


    cleanupDragState();


    socketGeneration++;


    const oldSocket =
        socket;


    socket =
        null;


    if (oldSocket) {

        if (
            oldSocket.readyState ===
            WebSocket.OPEN
        ) {

            try {

                oldSocket.send(
                    JSON.stringify({
                        type: "leave_room"
                    })
                );

            } catch (error) {

                console.error(
                    "Erro ao enviar saída:",
                    error
                );
            }
        }


        try {

            oldSocket.close(
                1000,
                "Saída solicitada pelo jogador"
            );

        } catch (error) {}
    }


    roomCode =
        "";

    playerNumber =
        null;

    matchConfigConfirmed =
        false;

    matchConfigMode = "create";
    matchConfigController = null;

    winsToFinish =
        1;


    updateWinsSelector();


    resetMatchScore();


    document.body.classList.remove(
        "player-1-theme",
        "player-2-theme"
    );


    updatePlayersList(
        []
    );


    waitingMessage.textContent =
        "AGUARDANDO OUTRO JOGADOR...";


    boardImages = [
        null,
        null,
        null,
        null,
        null,
        null
    ];


    createImageSlots();


    if (
        typeof resetAllGameVariables ===
        "function"
    ) {

        resetAllGameVariables();
    }


    resetRoomButtons();


    showScreen(
        lobby
    );
}


// ==========================================
// ABRIR CONFIGURAÇÃO DO TABULEIRO
// ==========================================

function openSetup() {

    playerTitle.textContent =
        "JOGADOR " +
        playerNumber;


    createImageSlots();


    showScreen(
        setup
    );
}


// ==========================================
// IMAGENS DO TABULEIRO
// ==========================================

let boardImages = [
    null,
    null,
    null,
    null,
    null,
    null
];


// ==========================================
// ESTADO GLOBAL DO DRAG
// ==========================================

let activeDragSlot = null;
let activeDragPointerId = null;


// ==========================================
// LIMPAR ESTADO GLOBAL DO DRAG
// ==========================================

function cleanupDragState() {

    if (activeDragSlot) {

        activeDragSlot.classList.remove(
            "dragging"
        );
    }


    document
        .querySelectorAll(".image-slot")
        .forEach(
            function (item) {

                item.classList.remove(
                    "drag-over"
                );

                item.classList.remove(
                    "dragging"
                );
            }
        );


    activeDragSlot =
        null;

    activeDragPointerId =
        null;
}


// ==========================================
// LIMPAR DRAG SE A JANELA PERDER FOCO
// ==========================================

window.addEventListener(
    "blur",
    function () {

        cleanupDragState();
    }
);


// ==========================================
// LIMPAR DRAG SE A PÁGINA FICAR OCULTA
// ==========================================

document.addEventListener(
    "visibilitychange",
    function () {

        if (document.hidden) {

            cleanupDragState();
        }
    }
);


// ==========================================
// ESC PARA CANCELAR DRAG
// ==========================================

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            cleanupDragState();
        }
    }
);


// ==========================================
// COMPRIMIR IMAGEM
// ==========================================

function compressImage(file) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    const img =
                        new Image();


                    img.onload =
                        function () {

                            const maxSize =
                                800;


                            let width =
                                img.width;

                            let height =
                                img.height;


                            if (
                                width > maxSize ||
                                height > maxSize
                            ) {

                                if (
                                    width > height
                                ) {

                                    height =
                                        Math.round(
                                            height *
                                            maxSize /
                                            width
                                        );

                                    width =
                                        maxSize;

                                } else {

                                    width =
                                        Math.round(
                                            width *
                                            maxSize /
                                            height
                                        );

                                    height =
                                        maxSize;
                                }
                            }


                            const canvas =
                                document.createElement(
                                    "canvas"
                                );


                            canvas.width =
                                width;

                            canvas.height =
                                height;


                            const ctx =
                                canvas.getContext(
                                    "2d"
                                );


                            if (!ctx) {

                                reject(
                                    new Error(
                                        "Não foi possível criar o canvas."
                                    )
                                );

                                return;
                            }


                            ctx.fillStyle =
                                "#ffffff";

                            ctx.fillRect(
                                0,
                                0,
                                width,
                                height
                            );


                            ctx.drawImage(
                                img,
                                0,
                                0,
                                width,
                                height
                            );


                            const compressed =
                                canvas.toDataURL(
                                    "image/jpeg",
                                    0.75
                                );


                            console.log(
                                "Imagem comprimida:",
                                compressed.length,
                                "caracteres"
                            );


                            resolve(
                                compressed
                            );
                        };


                    img.onerror =
                        function () {

                            reject(
                                new Error(
                                    "Não foi possível carregar a imagem."
                                )
                            );
                        };


                    img.src =
                        event.target.result;
                };


            reader.onerror =
                function () {

                    reject(
                        new Error(
                            "Não foi possível ler a imagem."
                        )
                    );
                };


            reader.readAsDataURL(
                file
            );
        }
    );
}


// ==========================================
// CRIAR OS 6 SLOTS
// ==========================================

function createImageSlots() {

    cleanupDragState();


    imageGrid.innerHTML =
        "";


    for (
        let i = 0;
        i < 6;
        i++
    ) {

        const slot =
            document.createElement(
                "div"
            );


        slot.className =
            "image-slot";


        slot.dataset.position =
            i;


        slot.style.touchAction =
            "none";


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "file";


        input.accept =
            "image/*";


        input.multiple =
            true;


        slot.appendChild(
            input
        );


        if (boardImages[i]) {

            const img =
                document.createElement(
                    "img"
                );


            img.src =
                boardImages[i];


            img.draggable =
                false;


            img.style.pointerEvents =
                "none";


            slot.appendChild(
                img
            );


            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.className =
                "delete-image-button";


            deleteButton.textContent =
                "×";


            deleteButton.title =
                "Excluir imagem";


            deleteButton.addEventListener(
                "pointerdown",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();
                }
            );


            deleteButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();


                    cleanupDragState();


                    boardImages[i] =
                        null;


                    createImageSlots();
                }
            );


            slot.appendChild(
                deleteButton
            );

        } else {

            const plus =
                document.createElement(
                    "span"
                );


            plus.textContent =
                "+";


            plus.style.pointerEvents =
                "none";


            slot.appendChild(
                plus
            );
        }


        slot.addEventListener(
            "click",
            function (event) {

                if (
                    slot.dataset.wasDragged ===
                    "true"
                ) {

                    slot.dataset.wasDragged =
                        "false";

                    return;
                }


                if (
                    event.target.closest(
                        ".delete-image-button"
                    )
                ) {
                    return;
                }


                input.click();
            }
        );


        input.addEventListener(
            "change",
            function (event) {

                loadImage(
                    event,
                    i
                );
            }
        );


        let dragging =
            false;

        let startX =
            0;

        let startY =
            0;

        let currentTarget =
            null;

        const DRAG_DISTANCE =
            8;


        // ==================================
        // INÍCIO DO ARRASTE
        // ==================================

        slot.addEventListener(
            "pointerdown",
            function (event) {

                if (
                    event.target.closest(
                        ".delete-image-button"
                    )
                ) {
                    return;
                }


                if (!boardImages[i]) {
                    return;
                }


                cleanupDragState();


                activeDragSlot =
                    slot;

                activeDragPointerId =
                    event.pointerId;


                startX =
                    event.clientX;


                startY =
                    event.clientY;


                dragging =
                    false;


                currentTarget =
                    null;


                slot.dataset.wasDragged =
                    "false";


                try {

                    slot.setPointerCapture(
                        event.pointerId
                    );

                } catch (error) {}
            }
        );


        // ==================================
        // MOVIMENTO
        // ==================================

        slot.addEventListener(
            "pointermove",
            function (event) {

                if (
                    activeDragSlot !== slot ||
                    activeDragPointerId !== event.pointerId
                ) {
                    return;
                }


                if (!dragging) {

                    const distanceX =
                        Math.abs(
                            event.clientX -
                            startX
                        );


                    const distanceY =
                        Math.abs(
                            event.clientY -
                            startY
                        );


                    if (
                        distanceX <
                            DRAG_DISTANCE &&
                        distanceY <
                            DRAG_DISTANCE
                    ) {
                        return;
                    }


                    dragging =
                        true;


                    slot.dataset.wasDragged =
                        "true";


                    slot.classList.add(
                        "dragging"
                    );
                }


                if (!dragging) {
                    return;
                }


                event.preventDefault();


                const element =
                    document.elementFromPoint(
                        event.clientX,
                        event.clientY
                    );


                const target =
                    element
                        ? element.closest(
                            ".image-slot"
                        )
                        : null;


                document
                    .querySelectorAll(
                        ".image-slot"
                    )
                    .forEach(
                        function (item) {

                            item.classList.remove(
                                "drag-over"
                            );
                        }
                    );


                if (
                    target &&
                    imageGrid.contains(
                        target
                    )
                ) {

                    const targetPosition =
                        Number(
                            target.dataset.position
                        );


                    if (
                        targetPosition !== i
                    ) {

                        target.classList.add(
                            "drag-over"
                        );


                        currentTarget =
                            targetPosition;

                    } else {

                        currentTarget =
                            null;
                    }

                } else {

                    currentTarget =
                        null;
                }
            }
        );


        // ==================================
        // SOLTAR
        // ==================================

        slot.addEventListener(
            "pointerup",
            function (event) {

                if (
                    activeDragSlot !== slot ||
                    activeDragPointerId !== event.pointerId
                ) {
                    return;
                }


                if (!dragging) {

                    try {

                        slot.releasePointerCapture(
                            event.pointerId
                        );

                    } catch (error) {}


                    activeDragSlot =
                        null;

                    activeDragPointerId =
                        null;

                    return;
                }


                event.preventDefault();


                const targetPosition =
                    currentTarget;


                dragging =
                    false;


                currentTarget =
                    null;


                try {

                    slot.releasePointerCapture(
                        event.pointerId
                    );

                } catch (error) {}


                cleanupDragState();


                if (
                    targetPosition !== null &&
                    targetPosition !== i &&
                    targetPosition >= 0 &&
                    targetPosition < 6
                ) {

                    const temp =
                        boardImages[i];


                    boardImages[i] =
                        boardImages[
                            targetPosition
                        ];


                    boardImages[
                        targetPosition
                    ] =
                        temp;


                    createImageSlots();
                }
            }
        );


        // ==================================
        // CANCELAMENTO
        // ==================================

        slot.addEventListener(
            "pointercancel",
            function (event) {

                if (
                    activeDragSlot !== slot ||
                    activeDragPointerId !== event.pointerId
                ) {
                    return;
                }


                dragging =
                    false;


                currentTarget =
                    null;


                cleanupDragState();
            }
        );


        // ==================================
        // PERDA DO POINTER CAPTURE
        // ==================================

        slot.addEventListener(
            "lostpointercapture",
            function () {

                if (
                    activeDragSlot !== slot
                ) {
                    return;
                }


                if (dragging) {

                    dragging =
                        false;

                    currentTarget =
                        null;

                    cleanupDragState();
                }
            }
        );


        imageGrid.appendChild(
            slot
        );
    }
}


// ==========================================
// COMPATIBILIDADE COM O HTML
// ==========================================

function loadImage(
    eventOrFile,
    position
) {

    let files;


    if (
        eventOrFile instanceof File
    ) {

        files = [
            eventOrFile
        ];


        if (
            typeof position !== "number"
        ) {

            position =
                boardImages.findIndex(
                    function (image) {
                        return image === null;
                    }
                );


            if (position === -1) {

                openPopup(
                    "TABULEIRO CHEIO",
                    "OS 6 ESPAÇOS DO TABULEIRO JÁ ESTÃO PREENCHIDOS.",
                    null,
                    "OK"
                );

                return;
            }
        }


    } else {

        if (
            !eventOrFile ||
            !eventOrFile.target ||
            !eventOrFile.target.files ||
            eventOrFile.target.files.length === 0
        ) {
            return;
        }


        files =
            Array.from(
                eventOrFile.target.files
            );
    }


    if (files.length === 1) {

        compressImage(files[0])
            .then(
                function (compressedImage) {

                    boardImages[position] =
                        compressedImage;

                    createImageSlots();
                }
            )
            .catch(
                function (error) {

                    console.error(
                        "Erro ao comprimir imagem:",
                        error
                    );

                    openPopup(
                        "ERRO",
                        "NÃO FOI POSSÍVEL CARREGAR ESSA IMAGEM.",
                        null,
                        "OK"
                    );
                }
            );

        return;
    }


    let currentPosition =
        position;

    const compressionPromises =
        [];


    files.forEach(
        function (file) {

            const targetPosition =
                currentPosition;


            const promise =
                compressImage(file)
                    .then(
                        function (compressedImage) {

                            boardImages[targetPosition] =
                                compressedImage;
                        }
                    );


            compressionPromises.push(
                promise
            );


            currentPosition =
                (currentPosition + 1) % 6;
        }
    );


    Promise.all(
        compressionPromises
    )
    .then(
        function () {

            createImageSlots();
        }
    )
    .catch(
        function (error) {

            console.error(
                "Erro ao comprimir imagens:",
                error
            );

            openPopup(
                "ERRO",
                "NÃO FOI POSSÍVEL CARREGAR UMA OU MAIS IMAGENS.",
                null,
                "OK"
            );
        }
    );
}


// ==========================================
// BOTÃO "PRONTO"
// ==========================================

function finishSetup() {

    const filled =
        boardImages.filter(
            function (image) {
                return image !== null;
            }
        ).length;


    if (filled < 6) {

        openPopup(
            "TABULEIRO INCOMPLETO",
            "POR FAVOR, COLOQUE 6 IMAGENS!",
            null,
            "OK"
        );

        return;
    }


    boardConfirmed();
}


// ==========================================
// POPUP
// ==========================================

let popupCallback =
    null;


function openPopup(
    title,
    message,
    callback,
    buttonText = "OK",
    showBoard = false
) {

    if (!gamePopup) {
        return;
    }


    const popupTitle =
        gamePopup.querySelector(
            "h2"
        );


    const popupMessage =
        gamePopup.querySelector(
            "p"
        );


    const popupActions =
        gamePopup.querySelector(
            ".popup-actions"
        );


    popupTitle.textContent =
        title;


    popupMessage.textContent =
        message;


    const popupContent =
        gamePopup.querySelector(
            ".game-popup"
        );


    if (popupContent) {

        const oldInput =
            popupContent.querySelector(
                "#restoreCodeInput"
            );

        if (oldInput) {
            oldInput.remove();
        }


        const oldCode =
            popupContent.querySelector(
                ".saved-game-code"
            );

        if (oldCode) {
            oldCode.remove();
        }


        const oldBetGrid =
            popupContent.querySelector(
                ".bet-popup-grid"
            );

        if (oldBetGrid) {
            oldBetGrid.remove();
        }


        const oldCharacterImage =
            popupContent.querySelector(
                ".popup-character-image"
            );

        if (oldCharacterImage) {
            oldCharacterImage.remove();
        }
    }


    popupCallback =
        callback;


    popupBoard.style.display =
        showBoard
            ? "grid"
            : "none";


    popupActions.innerHTML =
        "";


    if (buttonText) {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "popup-button";


        button.textContent =
            buttonText;


        button.addEventListener(
            "click",
            function () {

                const callbackToRun =
                    popupCallback;


                closePopup();


                if (callbackToRun) {

                    callbackToRun();
                }
            }
        );


        popupActions.appendChild(
            button
        );
    }


    if (showBoard) {

        const modify =
            document.createElement(
                "button"
            );


        modify.className =
            "popup-button secondary";


        modify.textContent =
            "MODIFICAR TABULEIRO";


        modify.addEventListener(
            "click",
            function () {

                closePopup();
            }
        );


        const confirm =
            document.createElement(
                "button"
            );


        confirm.className =
            "popup-button";


        confirm.textContent =
            "CONFIRMAR";


        confirm.addEventListener(
            "click",
            function () {

                closePopup();

                boardConfirmed();
            }
        );


        popupActions.appendChild(
            modify
        );


        popupActions.appendChild(
            confirm
        );
    }


    gamePopup.classList.add(
        "active"
    );
}


// ==========================================
// FECHAR POPUP
// ==========================================

function closePopup() {

    if (!gamePopup) {
        return;
    }


    gamePopup.classList.remove(
        "active"
    );


    popupCallback =
        null;
}


// ==========================================
// TABULEIRO CONFIRMADO
// ==========================================

function boardConfirmed() {

    if (window.ccmDebug) {
        window.ccmDebug("BOARD_READY", "imagens=" + boardImages.filter(function (image) { return image !== null; }).length + " socket=" + (socket ? socket.readyState : "null"));
    }

    waitingMessage.textContent =
        "SEU TABULEIRO FOI CONFIRMADO.";


    if (
        socket &&
        socket.readyState ===
        WebSocket.OPEN
    ) {

        const boardSize =
            JSON.stringify(
                boardImages
            ).length;


        console.log(
            "TAMANHO DO TABULEIRO:",
            boardSize,
            "caracteres"
        );


        socket.send(
            JSON.stringify({
                type: "board_ready",
                images: boardImages
            })
        );

        if (window.ccmDebug) {
            window.ccmDebug("BOARD_READY ENVIADO", "aguardando servidor");
        }

    } else {

        openPopup(
            "ERRO",
            "O WebSocket NÃO está conectado.",
            null,
            "OK"
        );

        return;
    }


    showScreen(
        waitingRoom
    );
}


// ==========================================
// SAIR DA CONFIGURAÇÃO
// ==========================================

function leaveSetup() {

    openPopup(
        "TEM CERTEZA?",
        "SEU TABULEIRO SERÁ DESCARTADO.",
        function () {

            boardImages = [
                null,
                null,
                null,
                null,
                null,
                null
            ];

            createImageSlots();

            leaveRoom();
        },
        "SAIR"
    );


    const popupActions =
        gamePopup.querySelector(
            ".popup-actions"
        );


    const backButton =
        document.createElement(
            "button"
        );


    backButton.className =
        "popup-button secondary";


    backButton.textContent =
        "VOLTAR";


    backButton.addEventListener(
        "click",
        function () {

            closePopup();
        }
    );


    popupActions.insertBefore(
        backButton,
        popupActions.firstChild
    );
}


// ==========================================
// SALVAR E RESGATAR TABULEIRO
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const btn =
            document.getElementById(
                "createSaveBoardButton"
            );

        if (btn) {

            btn.addEventListener(
                "click",
                openSaveOrRestoreBoardPopup
            );
        }
    }
);


function openSaveOrRestoreBoardPopup() {

    openPopup(
        "SALVAR OU RESGATAR TABULEIRO",
        "Deseja gerar um código para o seu tabuleiro atual ou resgatar um tabuleiro salvo por código?",
        null,
        false
    );


    const popupActions =
        gamePopup.querySelector(
            ".popup-actions"
        );


    if (popupActions) {

        popupActions.innerHTML =
            "";


        const restoreBtn =
            document.createElement(
                "button"
            );


        restoreBtn.className =
            "popup-button secondary";


        restoreBtn.textContent =
            "RESGATAR CÓDIGO";


        restoreBtn.onclick =
            function () {

                closePopup();

                handleRestoreBoardCode();
            };


        const saveBtn =
            document.createElement(
                "button"
            );


        saveBtn.className =
            "popup-button";


        saveBtn.textContent =
            "SALVAR E GERAR CÓDIGO";


        saveBtn.onclick =
            function () {

                closePopup();

                handleSaveBoardCode();
            };


        popupActions.appendChild(
            restoreBtn
        );


        popupActions.appendChild(
            saveBtn
        );
    }
}


function handleSaveBoardCode() {

    const hasImage =
        boardImages.some(
            function (img) {
                return img !== null;
            }
        );


    if (!hasImage) {

        openPopup(
            "TABULEIRO VAZIO",
            "Adicione pelo menos uma imagem ao tabuleiro antes de salvar.",
            null,
            "OK"
        );

        return;
    }


    const code =
        "TAB" +
        Math.floor(
            1000 +
            Math.random() *
            9000
        );


    try {

        localStorage.setItem(
            "saved_board_" + code,
            JSON.stringify(
                boardImages
            )
        );

    } catch (e) {

        console.error(
            "Erro ao salvar no localStorage",
            e
        );
    }


    openPopup(
        "TABULEIRO SALVO!",
        "Código gerado para este tabuleiro:",
        null,
        "FECHAR"
    );


    const popupContent =
        gamePopup.querySelector(
            ".game-popup"
        );


    const popupActions =
        popupContent.querySelector(
            ".popup-actions"
        );


    let codeElement =
        popupContent.querySelector(
            ".saved-game-code"
        );


    if (!codeElement) {

        codeElement =
            document.createElement(
                "div"
            );


        codeElement.className =
            "saved-game-code";


        popupContent.insertBefore(
            codeElement,
            popupActions
        );
    }


    codeElement.textContent =
        code;


    if (popupActions) {

        const copyBtn =
            document.createElement(
                "button"
            );


        copyBtn.className =
            "popup-button secondary";


        copyBtn.textContent =
            "📋 COPIAR CÓDIGO";


        copyBtn.onclick =
            function () {

                navigator.clipboard.writeText(
                    code
                );


                copyBtn.textContent =
                    "✓ COPIADO!";
            };


        popupActions.insertBefore(
            copyBtn,
            popupActions.firstChild
        );
    }
}


function handleRestoreBoardCode() {

    openPopup(
        "RESGATAR TABULEIRO",
        "Digite o código do tabuleiro salvo abaixo:",
        null,
        "CANCELAR"
    );


    const popupContent =
        gamePopup.querySelector(
            ".game-popup"
        );


    const popupActions =
        popupContent.querySelector(
            ".popup-actions"
        );


    const input =
        document.createElement(
            "input"
        );


    input.type =
        "text";


    input.id =
        "restoreCodeInput";


    input.placeholder =
        "EX: TAB1234";


    input.style.cssText =
        "width: 80%; padding: 10px; font-size: 1.1rem; border-radius: 8px; border: 2px solid #ccc; text-align: center; text-transform: uppercase; margin: 15px auto; display: block;";


    popupContent.insertBefore(
        input,
        popupActions
    );


    setTimeout(
        function () {

            input.focus();

        },
        100
    );


    const confirmBtn =
        document.createElement(
            "button"
        );


    confirmBtn.className =
        "popup-button";


    confirmBtn.textContent =
        "CARREGAR";


    confirmBtn.onclick =
        function () {

            const codeVal =
                input.value
                    .trim()
                    .toUpperCase();


            if (!codeVal) {
                return;
            }


            let saved =
                null;


            try {

                saved =
                    localStorage.getItem(
                        "saved_board_" +
                        codeVal
                    );

            } catch (e) {}


            if (!saved) {

                openPopup(
                    "CÓDIGO NÃO ENCONTRADO",
                    "Nenhum tabuleiro foi encontrado com o código: " +
                    codeVal,
                    null,
                    "OK"
                );

                return;
            }


            try {

                const images =
                    JSON.parse(
                        saved
                    );


                if (
                    Array.isArray(images) &&
                    images.length === 6
                ) {

                    boardImages =
                        images;


                    createImageSlots();


                    openPopup(
                        "TABULEIRO CARREGADO!",
                        "O tabuleiro " +
                        codeVal +
                        " foi carregado com sucesso.",
                        null,
                        "OK"
                    );
                }

            } catch (e) {

                openPopup(
                    "ERRO AO CARREGAR",
                    "Ocorreu um erro ao carregar o tabuleiro salvo.",
                    null,
                    "OK"
                );
            }
        };


    popupActions.appendChild(
        confirmBtn
    );
}


// ==========================================
// ADICIONAR IMAGEM PELO GOOGLE / COLAR
// ==========================================

const pasteImageButton =
    document.getElementById(
        "pasteImageButton"
    );

const imageSearchInput =
    document.getElementById(
        "imageSearchInput"
    );

const imageSearchButton =
    document.getElementById(
        "imageSearchButton"
    );

const imageSearchStatus =
    document.getElementById(
        "imageSearchStatus"
    );


// ==========================================
// PESQUISAR NO GOOGLE IMAGENS
// ==========================================

if (imageSearchButton) {

    imageSearchButton.addEventListener(
        "click",
        function () {

            const pesquisa =
                imageSearchInput
                    ? imageSearchInput.value.trim()
                    : "";


            if (!pesquisa) {

                if (imageSearchStatus) {

                    imageSearchStatus.textContent =
                        "DIGITE O QUE VOCÊ QUER PESQUISAR.";

                    imageSearchStatus.style.display =
                        "block";
                }

                return;
            }


            const url =
                "https://www.google.com/search?tbm=isch&q=" +
                encodeURIComponent(
                    pesquisa
                );


            window.open(
                url,
                "_blank"
            );


            if (imageSearchStatus) {

                imageSearchStatus.textContent =
                    "PESQUISA ABERTA EM UMA NOVA ABA.";

                imageSearchStatus.style.display =
                    "block";
            }
        }
    );
}


// ==========================================
// FECHAR JANELA DO GOOGLE
// ==========================================

const closeGoogleSearch =
    document.getElementById(
        "closeGoogleSearch"
    );


if (closeGoogleSearch) {

    closeGoogleSearch.addEventListener(
        "click",
        function () {

            const googleSearchWindow =
                document.getElementById(
                    "googleSearchWindow"
                );


            const googleSearchFrame =
                document.getElementById(
                    "googleSearchFrame"
                );


            if (googleSearchWindow) {

                googleSearchWindow.style.display =
                    "none";
            }


            if (googleSearchFrame) {

                googleSearchFrame.src =
                    "about:blank";
            }
        }
    );
}


// ==========================================
// COLAR IMAGEM
// ==========================================

async function colarImagem() {

    try {

        const itens =
            await navigator.clipboard.read();


        for (const item of itens) {

            const tiposImagem =
                item.types.filter(
                    function (tipo) {

                        return tipo.startsWith(
                            "image/"
                        );
                    }
                );


            if (
                tiposImagem.length === 0
            ) {
                continue;
            }


            const blob =
                await item.getType(
                    tiposImagem[0]
                );


            const arquivo =
                new File(
                    [blob],
                    "imagem-colada." +
                    tiposImagem[0].split("/")[1],
                    {
                        type:
                            tiposImagem[0]
                    }
                );


            loadImage(
                arquivo
            );


            if (imageSearchStatus) {

                imageSearchStatus.textContent =
                    "IMAGEM ADICIONADA AO TABULEIRO.";

                imageSearchStatus.style.display =
                    "block";
            }


            return;
        }


        if (imageSearchStatus) {

            imageSearchStatus.textContent =
                "NÃO FOI ENCONTRADA UMA IMAGEM COPIADA.";

            imageSearchStatus.style.display =
                "block";
        }


    } catch (erro) {

        console.error(
            "Erro ao colar imagem:",
            erro
        );


        if (imageSearchStatus) {

            imageSearchStatus.textContent =
                "NÃO FOI POSSÍVEL ACESSAR A IMAGEM COPIADA.";

            imageSearchStatus.style.display =
                "block";
        }
    }
}


// ==========================================
// BOTÃO COLAR IMAGEM
// ==========================================

if (pasteImageButton) {

    pasteImageButton.addEventListener(
        "click",
        colarImagem
    );
}


// ==========================================
// CTRL + V
// ==========================================

document.addEventListener(
    "paste",
    function (evento) {

        const itens =
            evento.clipboardData?.items;


        if (!itens) {
            return;
        }


        for (const item of itens) {

            if (
                !item.type.startsWith(
                    "image/"
                )
            ) {
                continue;
            }


            const arquivo =
                item.getAsFile();


            if (!arquivo) {
                return;
            }


            evento.preventDefault();


            loadImage(
                arquivo
            );


            if (imageSearchStatus) {

                imageSearchStatus.textContent =
                    "IMAGEM ADICIONADA AO TABULEIRO.";

                imageSearchStatus.style.display =
                    "block";
            }


            return;
        }
    }
);