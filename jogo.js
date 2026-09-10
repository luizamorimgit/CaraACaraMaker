// ==========================================
// CARA A CARA MAKER
// FUNCIONAMENTO DO JOGO
// ==========================================


// ==========================================
// ESTADO DA PARTIDA
// ==========================================

let gameCards = [];

let myBoardImages = [];
let opponentBoardImages = [];

let selectedCharacter = null;
let opponentCharacter = null;

let characterChoiceConfirmed = false;
let opponentChoiceConfirmed = false;

let gameStarted = false;

let gameInitialized = false;

// ==========================================
// ESTADO DE BLOQUEIO / APOSTA / TROCA
// ==========================================

let gameLocked = false;
let gameLockReason = null;

let betSelectionActive = false;
let betWaitingResult = false;
let betInProgress = false;

let replacementActive = false;
let replacementPlayer = null;
let replacementPreviousCharacter = null;
let replacementSelectionIndex = null;

let waitingOverlay = null;

// ==========================================
// ESTADO DA PARTIDA / PLACAR
// ==========================================

let matchScore = {
    1: 0,
    2: 0
};

let winsToFinish = 1;
let matchFinished = false;



// ==========================================
// ELEMENTOS DO JOGO
// ==========================================

let gameScreen = null;
let characterChoiceScreen = null;

let gameBoard = null;
let choiceBoard = null;

let betButton = null;
let leaveGameButton = null;
let saveBoardButton = null;

let gameStatus = null;
let gameRoomCode = null;
let choiceRoomCode = null;
let matchScoreElement = null;


// ==========================================
// INICIALIZAR ELEMENTOS
// ==========================================

function initializeGameElements() {

    gameScreen =
        document.getElementById("game");

    characterChoiceScreen =
        document.getElementById("characterChoice");

    gameBoard =
        document.getElementById("gameBoard");

    choiceBoard =
        document.getElementById("choiceBoard");

    betButton =
        document.getElementById("betButton");

    leaveGameButton =
        document.getElementById("leaveGameButton");

    saveBoardButton =
        document.getElementById("saveBoardButton");

    gameStatus =
        document.getElementById("gameStatus");

    gameRoomCode =
        document.getElementById("gameRoomCode");

    choiceRoomCode =
        document.getElementById("choiceRoomCode");

    matchScoreElement =
        document.getElementById("matchScore");

    updateMatchScore(
        matchScore[1],
        matchScore[2]
    );


    // ======================================
    // BOTÃO APOSTA
    // ======================================

    if (betButton) {

        betButton.addEventListener(
            "click",
            function () {

                openBetConfirmation();
            }
        );
    }


    // ======================================
    // BOTÃO SAIR
    // ======================================

    if (leaveGameButton) {

        leaveGameButton.addEventListener(
            "click",
            function () {

                confirmLeaveGame();
            }
        );
    }


    // ======================================
    // BOTÃO SALVAR
    // ======================================

    if (saveBoardButton) {

        saveBoardButton.addEventListener(
            "click",
            function () {

                openSaveGamePopup();
            }
        );
    }
}


// ==========================================
// GARANTIR QUE O DOM FOI CARREGADO
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeGameElements();
    }
);


// ==========================================
// ATUALIZAR PLACAR
// ==========================================

function updateMatchScore(score1, score2) {

    const parsedScore1 = Number(score1);
    const parsedScore2 = Number(score2);

    if (Number.isFinite(parsedScore1)) {
        matchScore[1] = parsedScore1;
    }

    if (Number.isFinite(parsedScore2)) {
        matchScore[2] = parsedScore2;
    }

    if (matchScoreElement) {
        matchScoreElement.textContent =
            "J1 — " +
            matchScore[1] +
            " × " +
            matchScore[2] +
            " — J2";
    }
}

function receiveMatchConfig(data = {}) {

    const configuredWins =
        Number(data.wins_to_finish);

    if ([1, 3, 5, 10].includes(configuredWins)) {
        winsToFinish = configuredWins;
    }

    if (data.score) {
        updateMatchScore(
            data.score[1] ?? data.score["1"] ?? 0,
            data.score[2] ?? data.score["2"] ?? 0
        );
    } else {
        updateMatchScore(0, 0);
    }

    matchFinished = false;
}

function receiveScoreUpdate(data = {}) {

    if (data.score) {
        updateMatchScore(
            data.score[1] ?? data.score["1"] ?? 0,
            data.score[2] ?? data.score["2"] ?? 0
        );
        return;
    }

    updateMatchScore(
        data.player1_score ?? matchScore[1],
        data.player2_score ?? matchScore[2]
    );
}

function resetMatchState() {

    matchScore[1] = 0;
    matchScore[2] = 0;
    matchFinished = false;

    updateMatchScore(0, 0);
}


// ==========================================
// RECEBER OS 12 PERSONAGENS
// ==========================================
//
// Esta função será chamada pelo script.js
// quando o servidor enviar os dois tabuleiros.
//
// images1 = 6 imagens do jogador 1
// images2 = 6 imagens do jogador 2
// ==========================================

function receiveGameBoards(
    images1,
    images2
) {

    matchFinished = false;

    if (!Array.isArray(images1)) {
        images1 = [];
    }

    if (!Array.isArray(images2)) {
        images2 = [];
    }


    myBoardImages =
        playerNumber === 1
            ? images1
            : images2;


    opponentBoardImages =
        playerNumber === 1
            ? images2
            : images1;


    gameCards = [];


    // ======================================
    // JOGADOR 1
    // ======================================

    images1.forEach(
        function (image, index) {

            gameCards.push({
                image: image,
                owner: 1,
                originalPosition: index,
                raised: true,
                wrong: false
            });
        }
    );


    // ======================================
    // JOGADOR 2
    // ======================================

    images2.forEach(
        function (image, index) {

            gameCards.push({
                image: image,
                owner: 2,
                originalPosition: index,
                raised: true,
                wrong: false
            });
        }
    );


    shuffleGameCards();


    openCharacterChoice();
}


// ==========================================
// EMBARALHAR AS 12 CARTAS
// ==========================================

function shuffleGameCards() {

    for (
        let i = gameCards.length - 1;
        i > 0;
        i--
    ) {

        const random =
            Math.floor(
                Math.random() * (i + 1)
            );


        const temp =
            gameCards[i];

        gameCards[i] =
            gameCards[random];

        gameCards[random] =
            temp;
    }
}


// ==========================================
// ESCOLHA DO PERSONAGEM
// ==========================================

function openCharacterChoice() {

if (!characterChoiceScreen) {
    return;
}


if (choiceRoomCode) {

    choiceRoomCode.textContent =
        roomCode || "----";
}


renderCharacterChoice();


showScreen(
    characterChoiceScreen
);

}


// ==========================================
// MOSTRAR AS 12 CARTAS
// ==========================================

function renderCharacterChoice() {

    if (!choiceBoard) {
        return;
    }


    choiceBoard.innerHTML = "";


    gameCards.forEach(
        function (card, index) {

            const cardElement =
                createGameCard(
                    card,
                    index,
                    true
                );


            choiceBoard.appendChild(
                cardElement
            );
        }
    );
}


// ==========================================
// CRIAR CARTA
// ==========================================

function createGameCard(
    card,
    index,
    choosing
) {

    const cardElement =
        document.createElement("div");


    cardElement.className =
        "game-card";


    cardElement.dataset.index =
        index;


    // ======================================
    // FRENTE
    // ======================================

    const front =
        document.createElement("div");


    front.className =
        "game-card-face game-card-front";


    const image =
        document.createElement("img");


    image.src =
        card.image;


    image.alt =
        "Personagem";


    front.appendChild(
        image
    );


    // ======================================
    // VERSO
    // ======================================

    const back =
        document.createElement("div");


    back.className =
        "game-card-face game-card-back";


    back.textContent =
        "?";


    // ======================================
    // ESTRUTURA
    // ======================================

    cardElement.appendChild(
        front
    );

    cardElement.appendChild(
        back
    );


    // ======================================
    // ESCOLHA DO PERSONAGEM
    // ======================================

    if (choosing) {

        cardElement.addEventListener(
            "click",
            function () {

                selectCharacter(
                    index,
                    cardElement
                );
            }
        );

        return cardElement;
    }


    // ======================================
    // JOGO NORMAL
    // ======================================

    cardElement.addEventListener(
        "click",
        function () {

            toggleGameCard(
                index,
                cardElement
            );
        }
    );


    return cardElement;
}


// ==========================================
// SELECIONAR PERSONAGEM
// ==========================================

function selectCharacter(
    index,
    element
) {

    if (characterChoiceConfirmed) {
        return;
    }


    document
        .querySelectorAll(
            "#choiceBoard .game-card"
        )
        .forEach(
            function (card) {

                card.classList.remove(
                    "selected"
                );
            }
        );


    element.classList.add(
        "selected"
    );


    selectedCharacter =
        gameCards[index];


    openCharacterConfirmation();
}


// ==========================================
// CONFIRMAR PERSONAGEM
// ==========================================

function openCharacterConfirmation() {

    if (!selectedCharacter) {
        return;
    }


    const image =
        selectedCharacter.image;


    openCustomPopup(
        "CONFIRMAR PERSONAGEM?",
        "Você escolheu este personagem.",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {}
            },
            {
                text: "CONFIRMAR",
                secondary: false,
                action: function () {

                    confirmCharacter(
                        image
                    );
                }
            }
        ],
        image
    );
}


// ==========================================
// CONFIRMAR PERSONAGEM ESCOLHIDO
// ==========================================

function confirmCharacter(image) {

    characterChoiceConfirmed =
        true;


    if (gameStatus) {

        gameStatus.textContent =
            "PERSONAGEM CONFIRMADO. AGUARDANDO O OUTRO JOGADOR...";
    }


    // ======================================
    // AVISAR O SERVIDOR
    // ======================================

    sendGameMessage({
        type: "character_selected",
        image: image
    });


    // ======================================
    // DESABILITAR CARTAS
    // ======================================

    document
        .querySelectorAll(
            "#choiceBoard .game-card"
        )
        .forEach(
            function (card) {

                card.classList.add(
                    "disabled"
                );
            }
        );
}


// ==========================================
// OUTRO JOGADOR CONFIRMOU
// ==========================================

function opponentCharacterConfirmed() {

    if (replacementActive) {
        return;
    }

    opponentChoiceConfirmed =
        true;


    if (
        characterChoiceConfirmed &&
        opponentChoiceConfirmed
    ) {

        startGame();
    }
}


// ==========================================
// INICIAR JOGO
// ==========================================

function startGame() {

    if (matchFinished) {
        return;
    }

    if (gameStarted) {
        return;
    }


    gameStarted = true;

    gameInitialized = true;


    if (gameRoomCode) {

        gameRoomCode.textContent =
            roomCode || "----";
    }


    if (gameStatus) {

        gameStatus.textContent =
            "ENCONTRE O PERSONAGEM DO ADVERSÁRIO!";
    }


    renderGameBoard();


    showScreen(
        gameScreen
    );
}


// ==========================================
// RENDERIZAR TABULEIRO
// ==========================================

function renderGameBoard() {

    if (!gameBoard) {
        return;
    }


    gameBoard.innerHTML = "";


    gameCards.forEach(
        function (card, index) {

            const element =
                createGameCard(
                    card,
                    index,
                    false
                );


            if (!card.raised) {

                element.classList.add(
                    "flipped"
                );
            }

            if (card.wrong) {
                element.classList.add(
                    "wrong-guess"
                );
            }

            if (gameLocked) {
                element.classList.add(
                    "disabled"
                );
            }

            gameBoard.appendChild(
                element
            );
        }
    );
}


// ==========================================
// LEVANTAR / ABAIXAR CARTA
// ==========================================

function toggleGameCard(
    index,
    element
) {

    if (!gameStarted || gameLocked) {
        return;
    }

    if (betSelectionActive || betWaitingResult) {
        return;
    }

    const card = gameCards[index];

    if (!card) {
        return;
    }

    card.raised = !card.raised;

    element.classList.toggle(
        "flipped",
        !card.raised
    );

    sendGameMessage({
        type: "card_toggle",
        index: index,
        raised: card.raised
    });
}


// ==========================================
// APOSTA
// ==========================================

function openBetConfirmation() {

    if (
        !gameStarted ||
        gameLocked ||
        replacementActive ||
        betSelectionActive ||
        betWaitingResult ||
        betInProgress
    ) {
        return;
    }

    openCustomPopup(
        "CONFIRMAR APOSTA?",
        "Tem certeza que quer dar uma aposta agora?",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {}
            },
            {
                text: "APOSTAR",
                secondary: false,
                action: function () {
                    beginBet();
                }
            }
        ]
    );
}


// ==========================================
// PEDIR BLOQUEIO DE APOSTA AO SERVIDOR
// ==========================================

function requestBetLock() {

    sendGameMessage({
        type: "bet_lock",
        action: "start"
    });
}


function releaseBetLock() {

    sendGameMessage({
        type: "bet_lock",
        action: "cancel"
    });
}


// ==========================================
// COMEÇAR APOSTA
// ==========================================

function beginBet() {

    if (
        !gameStarted ||
        gameLocked ||
        replacementActive ||
        betWaitingResult
    ) {
        return;
    }

    betSelectionActive = true;
    betInProgress = true;

    // O servidor é quem decide se o bloqueio pode começar.
    requestBetLock();

    openCustomPopup(
        "FAÇA SUA APOSTA",
        "Escolha a carta que você acredita ser o personagem do adversário.",
        [
            {
                text: "CANCELAR",
                secondary: true,
                action: function () {
                    cancelBetSelection();
                }
            }
        ]
    );

    enableBetSelection();
}


// ==========================================
// CANCELAR SELEÇÃO DA APOSTA
// ==========================================

function cancelBetSelection() {

    disableBetSelection();

    betSelectionActive = false;
    betWaitingResult = false;
    betInProgress = false;

    releaseBetLock();

    if (gameStatus && gameStarted) {
        gameStatus.textContent =
            "ENCONTRE O PERSONAGEM DO ADVERSÁRIO!";
    }
}


// ==========================================
// ATIVAR SELEÇÃO PARA APOSTA
// ==========================================

function enableBetSelection() {

    if (gameLocked || replacementActive) {
        return;
    }

    betSelectionActive = true;

    document
        .querySelectorAll(
            "#gameBoard .game-card"
        )
        .forEach(
            function (element) {

                element.classList.add(
                    "bet-selection"
                );

                element.onclick =
                    function () {

                        if (
                            gameLocked ||
                            !betSelectionActive
                        ) {
                            return;
                        }

                        const index =
                            Number(
                                element.dataset.index
                            );

                        const card =
                            gameCards[index];

                        if (!card) {
                            return;
                        }

                        confirmBet(
                            card,
                            element
                        );
                    };
            }
        );
}


// ==========================================
// CONFIRMAR APOSTA
// ==========================================

function confirmBet(
    card,
    element
) {

    if (
        gameLocked ||
        !betSelectionActive ||
        !card
    ) {
        return;
    }

    disableBetSelection();
    betSelectionActive = false;

    openCustomPopup(
        "CONFIRMAR APOSTA?",
        "Você realmente quer apostar neste personagem?",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {
                    betSelectionActive = true;
                    enableBetSelection();
                }
            },
            {
                text: "APOSTAR",
                secondary: false,
                action: function () {
                    sendBet(card);
                }
            }
        ],
        card.image
    );
}


// ==========================================
// ENVIAR APOSTA
// ==========================================

function sendBet(card) {

    if (
        !card ||
        gameLocked ||
        replacementActive
    ) {
        return;
    }

    disableBetSelection();

    betSelectionActive = false;
    betWaitingResult = true;
    betInProgress = true;

    sendGameMessage({
        type: "make_bet",
        card_index: gameCards.indexOf(card),
        card_image: card.image
    });

    if (gameStatus) {
        gameStatus.textContent =
            "AGUARDANDO RESULTADO...";
    }
}


// ==========================================
// DESATIVAR APOSTA
// ==========================================

function disableBetSelection() {

    document
        .querySelectorAll(
            "#gameBoard .game-card"
        )
        .forEach(
            function (element) {

                element.classList.remove(
                    "bet-selection"
                );

                element.onclick = null;
            }
        );

    if (gameStarted) {
        document
            .querySelectorAll(
                "#gameBoard .game-card"
            )
            .forEach(
                function (element) {

                    const index =
                        Number(
                            element.dataset.index
                        );

                    element.onclick =
                        function () {
                            toggleGameCard(
                                index,
                                element
                            );
                        };
                }
            );
    }
}


// ==========================================
// BLOQUEAR / DESBLOQUEAR TABULEIRO
// ==========================================

function setGameLock(
    locked,
    reason = null,
    showOverlay = false,
    title = "AGUARDE",
    message = "O outro jogador está realizando uma ação."
) {

    gameLocked = locked;
    gameLockReason = reason;

    if (locked) {
        disableBetSelection();

        if (betButton) {
            betButton.disabled = true;
        }

        if (showOverlay) {
            showWaitingOverlay(
                title,
                message
            );
        }

        return;
    }

    if (!replacementActive && !betSelectionActive && !betWaitingResult) {
        if (betButton && gameStarted) {
            betButton.disabled = false;
        }

        hideWaitingOverlay();
        disableBetSelection();
    }
}


// ==========================================
// OVERLAY DE ESPERA
// ==========================================

function showWaitingOverlay(
    title,
    message
) {

    if (!waitingOverlay) {
        waitingOverlay =
            document.createElement("div");

        waitingOverlay.className =
            "waiting-overlay";

        waitingOverlay.innerHTML =
            '<div class="waiting-box">' +
                '<div class="spinner">⏳</div>' +
                '<h2></h2>' +
                '<p></p>' +
            '</div>';

        document.body.appendChild(
            waitingOverlay
        );
    }

    const box =
        waitingOverlay.querySelector(
            ".waiting-box"
        );

    if (box) {
        const heading =
            box.querySelector("h2");

        const text =
            box.querySelector("p");

        if (heading) {
            heading.textContent = title;
        }

        if (text) {
            text.textContent = message;
        }
    }

    waitingOverlay.style.display = "flex";
    document.body.classList.add(
        "waiting-active"
    );
}


function hideWaitingOverlay() {

    if (waitingOverlay) {
        waitingOverlay.style.display =
            "none";
    }

    document.body.classList.remove(
        "waiting-active"
    );
}


// ==========================================
// APOSTA CORRETA
// ==========================================

function handleCorrectBet(data = {}) {

    const bettor =
        Number(data.bettor);

    const iWon =
        !bettor || bettor === Number(playerNumber);

    if (gameStatus) {
        gameStatus.textContent =
            iWon
                ? "VOCÊ ACERTOU!"
                : "O OUTRO JOGADOR ACERTOU.";
    }

    if (iWon) {
        openCustomPopup(
            "VOCÊ ACERTOU!",
            "Você encontrou o personagem do adversário!",
            [
                {
                    text: "CONTINUAR",
                    secondary: false,
                    action: function () {
                        if (replacementActive) {
                            showReplacementWaitingIfNeeded();
                        }
                    }
                }
            ]
        );
    } else {
        openCustomPopup(
            "VOCÊ PERDEU!",
            "O outro jogador encontrou seu personagem. Você precisará escolher um novo personagem para continuar.",
            [
                {
                    text: "ESCOLHER OUTRO PERSONAGEM",
                    secondary: false,
                    action: function () {
                        startCharacterReplacement();
                    }
                }
            ],
            selectedCharacter
                ? selectedCharacter.image
                : null
        );
    }
}


// ==========================================
// APOSTA ERRADA
// ==========================================

function handleWrongBet(data = {}) {

    betWaitingResult = false;
    betInProgress = false;

    openCustomPopup(
        "VOCÊ ERROU!",
        "Você não encontrou o personagem do adversário.",
        [
            {
                text: "REVELAR PERSONAGEM",
                secondary: false,
                action: function () {
                    revealOpponentCharacter();
                }
            },
            {
                text: "CONTINUAR",
                secondary: true,
                action: function () {
                    resetMyBoard();
                }
            }
        ]
    );
}


// ==========================================
// REVELAR PERSONAGEM
// ==========================================

function revealOpponentCharacter() {

    if (!opponentCharacter) {

        openCustomPopup(
            "PERSONAGEM",
            "O personagem escolhido pelo adversário ainda não foi recebido.",
            [
                {
                    text: "CONTINUAR",
                    secondary: false,
                    action: function () {
                        resetMyBoard();
                    }
                }
            ]
        );

        return;
    }

    openCustomPopup(
        "O PERSONAGEM ERA:",
        "Este era o personagem escolhido pelo outro jogador.",
        [
            {
                text: "CONTINUAR",
                secondary: false,
                action: function () {
                    resetMyBoard();
                }
            }
        ],
        opponentCharacter
    );
}


// ==========================================
// RESETAR MEU TABULEIRO
// ==========================================

function resetMyBoard() {

    gameCards.forEach(
        function (card) {
            card.raised = true;
            card.wrong = false;
        }
    );

    renderGameBoard();

    if (gameStatus) {
        gameStatus.textContent =
            "A PARTIDA CONTINUA. FAÇA SUAS DEDUÇÕES.";
    }

    sendGameMessage({
        type: "reset_board"
    });
}


// ==========================================
// INICIAR TROCA DE PERSONAGEM
// ==========================================

function startCharacterReplacement() {

    if (
        !replacementActive ||
        Number(replacementPlayer) !== Number(playerNumber)
    ) {
        return;
    }

    if (selectedCharacter) {
        replacementPreviousCharacter =
            selectedCharacter.image;
    }

    selectedCharacter = null;
    characterChoiceConfirmed = false;
    replacementSelectionIndex = null;

    resetMatchState();

    hideWaitingOverlay();

    openCharacterReplacementPopup();
}


// ==========================================
// POPUP DE ESCOLHA DO NOVO PERSONAGEM
// ==========================================

function openCharacterReplacementPopup() {

    if (!replacementActive) {
        return;
    }

    if (
        Number(replacementPlayer) !==
        Number(playerNumber)
    ) {
        return;
    }

    openCustomPopup(
        "ESCOLHA OUTRO PERSONAGEM",
        "Escolha um dos 12 personagens para ser seu novo personagem secreto.",
        []
    );

    const popupContent =
        gamePopup
            ? gamePopup.querySelector(".game-popup")
            : null;

    if (!popupContent) {
        return;
    }

    const popupBoard =
        popupContent.querySelector(".popup-board");

    if (!popupBoard) {
        console.error(
            "O HTML precisa conter .popup-board para a troca de personagem."
        );
        return;
    }

    popupBoard.innerHTML = "";
    popupBoard.style.display = "grid";

    gameCards.forEach(
        function (card, index) {

            if (
                replacementPreviousCharacter &&
                card.image === replacementPreviousCharacter
            ) {
                return;
            }

            const slot =
                document.createElement("div");

            slot.className =
                "popup-slot";

            slot.dataset.index =
                index;

            slot.style.cursor =
                "pointer";

            const image =
                document.createElement("img");

            image.src = card.image;
            image.alt = "Personagem";

            slot.appendChild(image);

            slot.addEventListener(
                "click",
                function () {

                    if (
                        !replacementActive ||
                        Number(replacementPlayer) !== Number(playerNumber)
                    ) {
                        return;
                    }

                    replacementSelectionIndex = index;
                    openReplacementConfirmation(
                        index
                    );
                }
            );

            popupBoard.appendChild(slot);
        }
    );
}


// ==========================================
// CONFIRMAR NOVO PERSONAGEM
// ==========================================

function openReplacementConfirmation(index) {

    const card =
        gameCards[index];

    if (!card) {
        return;
    }

    if (
        replacementPreviousCharacter &&
        card.image === replacementPreviousCharacter
    ) {
        return;
    }

    openCustomPopup(
        "CONFIRMAR PERSONAGEM?",
        "Este será seu novo personagem secreto.",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {
                    openCharacterReplacementPopup();
                }
            },
            {
                text: "CONFIRMAR",
                secondary: false,
                action: function () {
                    confirmCharacterReplacement(
                        index,
                        card.image
                    );
                }
            }
        ],
        card.image
    );
}


function confirmCharacterReplacement(
    index,
    image
) {

    if (
        !replacementActive ||
        Number(replacementPlayer) !== Number(playerNumber)
    ) {
        return;
    }

    if (
        !image ||
        !gameCards[index] ||
        gameCards[index].image !== image
    ) {
        return;
    }

    if (
        replacementPreviousCharacter &&
        image === replacementPreviousCharacter
    ) {
        return;
    }

    characterChoiceConfirmed = true;
    selectedCharacter = gameCards[index];

    if (gameStatus) {
        gameStatus.textContent =
            "NOVO PERSONAGEM CONFIRMADO. AGUARDANDO...";
    }

    sendGameMessage({
        type: "character_replacement_selected",
        image: image
    });

    // A seleção já foi enviada. O servidor libera a partida
    // somente depois de validar a troca.
    setGameLock(
        true,
        "replacement",
        false
    );
}


// ==========================================
// INÍCIO DA TROCA RECEBIDO DO SERVIDOR
// ==========================================

function handleCharacterReplacementStarted(data) {

    replacementActive = true;
    replacementPlayer =
        Number(data.loser);

    replacementPreviousCharacter =
        data.previous_character ||
        (
            Number(replacementPlayer) === Number(playerNumber) &&
            selectedCharacter
                ? selectedCharacter.image
                : null
        );

    gameStarted = false;
    characterChoiceConfirmed =
        Number(replacementPlayer) !== Number(playerNumber);

    betSelectionActive = false;
    betWaitingResult = false;
    betInProgress = false;

    disableBetSelection();

    if (betButton) {
        betButton.disabled = true;
    }

    if (
        Number(replacementPlayer) ===
        Number(playerNumber)
    ) {
        setGameLock(
            true,
            "replacement",
            false
        );

        openCustomPopup(
            "VOCÊ PRECISA ESCOLHER OUTRO",
            "Seu personagem foi descoberto. Escolha um novo personagem para continuar.",
            [
                {
                    text: "ESCOLHER OUTRO PERSONAGEM",
                    secondary: false,
                    action: function () {
                        startCharacterReplacement();
                    }
                }
            ]
        );

        return;
    }

    // O popup de vitória continua clicável.
    // O overlay só aparece depois que o vencedor toca em CONTINUAR.
    setGameLock(
        true,
        "replacement",
        false
    );
}


// ==========================================
// TROCA CONCLUÍDA
// ==========================================

function handleCharacterReplacementComplete(data) {

    const replacedPlayer =
        Number(data.player);

    const winner =
        Number(data.winner);

    if (!data.image) {
        return;
    }

    replacementActive = false;
    replacementPlayer = null;
    replacementSelectionIndex = null;

    if (
        replacedPlayer === Number(playerNumber)
    ) {
        selectedCharacter =
            gameCards.find(
                function (card) {
                    return card.image === data.image;
                }
            ) || null;

        characterChoiceConfirmed = true;
    } else {
        opponentCharacter =
            data.image;
    }

    // Somente o vencedor limpa o próprio tabuleiro.
    // O perdedor mantém exatamente os X/cartas que já tinha.
    if (
        winner === Number(playerNumber)
    ) {
        gameCards.forEach(
            function (card) {
                card.raised = true;
                card.wrong = false;
            }
        );
    }

    gameStarted = true;
    gameInitialized = true;
    gameLocked = false;
    gameLockReason = null;

    betSelectionActive = false;
    betWaitingResult = false;
    betInProgress = false;

    replacementPreviousCharacter = null;

    hideWaitingOverlay();
    closePopup();

    if (betButton) {
        betButton.disabled = false;
    }

    if (gameStatus) {
        gameStatus.textContent =
            "A PARTIDA CONTINUA. FAÇA SUAS DEDUÇÕES.";
    }

    renderGameBoard();
    showGameScreen();
}


// ==========================================
// MOSTRAR ESPERA APÓS POPUP DO VENCEDOR
// ==========================================

function showReplacementWaitingIfNeeded() {

    if (
        replacementActive &&
        Number(replacementPlayer) !== Number(playerNumber)
    ) {
        showWaitingOverlay(
            "AGUARDE O OUTRO JOGADOR",
            "O outro jogador está escolhendo um novo personagem."
        );
    }
}


// ==========================================
// RODADA VENCIDA
// ==========================================

function handleRoundWon(data = {}) {

    receiveScoreUpdate(data);

    betSelectionActive = false;
    betWaitingResult = false;
    betInProgress = false;

    setGameLock(
        true,
        "round",
        false
    );

    if (gameStatus) {
        const winner = Number(data.winner);

        gameStatus.textContent =
            winner === Number(playerNumber)
                ? "VOCÊ VENCEU A RODADA!"
                : "O OUTRO JOGADOR VENCEU A RODADA.";
    }
}


// ==========================================
// PARTIDA VENCIDA
// ==========================================

function closeBetUI() {

    betSelectionActive = false;
    betWaitingResult = false;
    betInProgress = false;

    disableBetSelection();
    hideWaitingOverlay();
    closePopup();

    if (betButton) {
        betButton.disabled = true;
    }
}


function handleMatchWon(data = {}) {

    closeBetUI();

    receiveScoreUpdate(data);

    const winner = Number(data.winner);
    const iWon =
        winner === Number(playerNumber);

    matchFinished = true;
    gameStarted = false;
    gameLocked = true;
    gameLockReason = "match_finished";

    replacementActive = false;
    replacementPlayer = null;

    if (gameStatus) {
        gameStatus.textContent =
            iWon
                ? "VOCÊ VENCEU A PARTIDA!"
                : "VOCÊ PERDEU A PARTIDA";
    }

    openMatchFinishedPopup(iWon);
}


function openMatchFinishedPopup(iWon) {

    const finalScore =
        "J1 — " +
        matchScore[1] +
        " × " +
        matchScore[2] +
        " — J2";

    openCustomPopup(
        iWon
            ? "VOCÊ VENCEU A PARTIDA!"
            : "VOCÊ PERDEU A PARTIDA",
        finalScore,
        [
            {
                text: "JOGAR NOVAMENTE",
                secondary: false,
                action: function () {
                    requestPlayAgain();
                }
            },
            {
                text: "MUDAR VITÓRIAS",
                secondary: true,
                action: function () {
                    requestChangeMatchConfig();
                }
            },
            {
                text: "SAIR DA PARTIDA",
                secondary: true,
                action: function () {
                    leaveGame();
                }
            }
        ]
    );
}


// ==========================================
// JOGAR NOVAMENTE
// ==========================================

function requestPlayAgain() {

    resetRoundVariables();

    matchFinished = false;

    sendGameMessage({
        type: "play_again"
    });

    if (gameStatus) {
        gameStatus.textContent =
            "AGUARDANDO NOVA RODADA...";
    }
}


// ==========================================
// MUDAR QUANTIDADE DE VITÓRIAS
// ==========================================

function requestChangeMatchConfig() {

    resetRoundVariables();

    matchFinished = false;

    sendGameMessage({
        type: "change_match_config"
    });

    if (typeof openMatchConfig === "function") {
        openMatchConfig();
    }
}


// ==========================================
// RESETAR VARIÁVEIS DA RODADA
// ==========================================

function resetRoundVariables() {

    gameStarted = false;
    gameInitialized = false;

    gameLocked = false;
    gameLockReason = null;

    betSelectionActive = false;
    betWaitingResult = false;
    betInProgress = false;

    replacementActive = false;
    replacementPlayer = null;
    replacementPreviousCharacter = null;
    replacementSelectionIndex = null;

    selectedCharacter = null;
    opponentCharacter = null;
    characterChoiceConfirmed = false;
    opponentChoiceConfirmed = false;

    gameCards = [];

    hideWaitingOverlay();

    if (betButton) {
        betButton.disabled = false;
    }
}


// ==========================================
// FINALIZAR / MANTER PARTIDA
// ==========================================

function finishGame() {

    if (gameStatus) {
        gameStatus.textContent =
            "A PARTIDA CONTINUA.";
    }
}


// ==========================================
// ABANDONAR PARTIDA
// ==========================================

function confirmLeaveGame() {

    openCustomPopup(
        "ABANDONAR PARTIDA?",
        "Seu tabuleiro será perdido.",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {}
            },
            {
                text: "ABANDONAR",
                secondary: false,
                action: function () {

                    leaveGame();
                }
            }
        ]
    );
}


// ==========================================
// SAIR
// ==========================================

function leaveGame() {

    sendGameMessage({
        type: "leave_game"
    });


    gameStarted = false;

    gameInitialized = false;

    gameCards = [];

    selectedCharacter = null;

    opponentCharacter = null;

    gameLocked = false;
    gameLockReason = null;
    betSelectionActive = false;
    betWaitingResult = false;
    betInProgress = false;
    replacementActive = false;
    replacementPlayer = null;
    replacementPreviousCharacter = null;
    replacementSelectionIndex = null;

    hideWaitingOverlay();


    if (socket) {

        try {
            socket.close();
        } catch (error) {}
    }


    socket = null;

    roomCode = "";

    playerNumber = null;


    showScreen(
        lobby
    );
}


// ==========================================
// SALVAR PARTIDA
// ==========================================

function openSaveGamePopup() {

    openCustomPopup(
        "SALVAR TABULEIRO?",
        "Sua partida poderá ser retomada posteriormente.",
        [
            {
                text: "VOLTAR",
                secondary: true,
                action: function () {}
            },
            {
                text: "SALVAR",
                secondary: false,
                action: function () {

                    saveGame();
                }
            }
        ]
    );
}


// ==========================================
// SALVAR
// ==========================================

function saveGame() {

    sendGameMessage({
        type: "save_game"
    });


    // ======================================
    // PEDIR AO SERVIDOR O CÓDIGO
    // ======================================

    openCustomPopup(
        "PARTIDA SALVA",
        "O servidor irá gerar o código de recuperação.",
        [
            {
                text: "OK",
                secondary: false,
                action: function () {}
            }
        ]
    );
}


// ==========================================
// RECEBER CÓDIGO DE SALVAMENTO
// ==========================================

function receiveSavedGameCode(code) {

    openCustomPopup(
        "PARTIDA SALVA",
        "Use este código para continuar sua partida:",
        [
            {
                text: "OK",
                secondary: false,
                action: function () {}
            }
        ],
        null,
        false,
        code
    );
}


// ==========================================
// ENVIAR MENSAGEM PELO WEBSOCKET
// ==========================================

function sendGameMessage(message) {

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        console.error(
            "WebSocket não está conectado."
        );

        return;
    }


    try {

        socket.send(
            JSON.stringify(message)
        );

    } catch (error) {

        console.error(
            "Erro ao enviar mensagem:",
            error
        );
    }
}


// ==========================================
// POPUP ESPECIAL DO JOGO
// ==========================================
//
// Reutiliza o popup que já existe no HTML.
// ==========================================

function openCustomPopup(
    title,
    message,
    buttons,
    image = null,
    unused = false,
    extraText = null
) {

    if (!gamePopup) {
        return;
    }

    const popupContent =
        gamePopup.querySelector(".game-popup");

    if (!popupContent) {
        return;
    }


    const popupTitle =
        popupContent.querySelector("h2");


    const popupMessage =
        popupContent.querySelector("p");


    const popupActions =
        popupContent.querySelector(".popup-actions");


    if (
        !popupTitle ||
        !popupMessage ||
        !popupActions
    ) {
        return;
    }


    popupTitle.textContent =
        title;


    popupMessage.textContent =
        message;


    popupActions.innerHTML =
        "";

    // O quadro interno do popup é usado pela troca de personagem.
    const existingPopupBoard =
        popupContent.querySelector(".popup-board");

    if (existingPopupBoard) {
        existingPopupBoard.innerHTML = "";
        existingPopupBoard.style.display = "none";
    }


    // ======================================
    // IMAGEM
    // ======================================

    const existingImage =
        popupContent.querySelector(
            ".popup-character-image"
        );


    if (existingImage) {

        existingImage.remove();
    }


    if (image) {

        const imageElement =
            document.createElement("img");


        imageElement.className =
            "popup-character-image";


        imageElement.src =
            image;


        imageElement.alt =
            "Personagem";


        popupContent.insertBefore(
            imageElement,
            popupActions
        );
    }


    // ======================================
    // TEXTO EXTRA
    // ======================================

    const existingCode =
        popupContent.querySelector(
            ".saved-game-code"
        );


    if (existingCode) {

        existingCode.remove();
    }


    if (extraText) {

        const codeElement =
            document.createElement("div");


        codeElement.className =
            "saved-game-code";


        codeElement.textContent =
            extraText;


        popupContent.insertBefore(
            codeElement,
            popupActions
        );
    }


    // ======================================
    // BOTÕES
    // ======================================

    buttons.forEach(
        function (buttonData) {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "popup-button";


            if (
                buttonData.secondary
            ) {

                button.classList.add(
                    "secondary"
                );
            }


            button.textContent =
                buttonData.text;


            button.addEventListener(
                "click",
                function () {

                    closePopup();


                    if (
                        typeof buttonData.action ===
                        "function"
                    ) {

                        buttonData.action();
                    }
                }
            );


            popupActions.appendChild(
                button
            );
        }
    );


    gamePopup.classList.add(
        "active"
    );
}


// ==========================================
// RECEBER MENSAGENS DO SERVIDOR
// ==========================================
//
// Esta função será chamada pelo script.js.
// ==========================================

function handleGameMessage(data) {

    if (!data || !data.type) {
        return;
    }

    // ======================================
    // CONFIGURAÇÃO DA PARTIDA
    // ======================================

    if (data.type === "match_config") {

        receiveMatchConfig(data);
        return;
    }


    // ======================================
    // ATUALIZAÇÃO DO PLACAR
    // ======================================

    if (data.type === "score_update") {

        receiveScoreUpdate(data);
        return;
    }


    // ======================================
    // RODADA VENCIDA
    // ======================================

    if (data.type === "round_won") {

        handleRoundWon(data);
        return;
    }


    // ======================================
    // PARTIDA VENCIDA
    // ======================================

    if (data.type === "match_won") {

        handleMatchWon(data);
        return;
    }


    // ======================================
    // NOVA PARTIDA / NOVA RODADA
    // ======================================

    if (data.type === "play_again") {

        resetRoundVariables();
        matchFinished = false;

        if (data.score) {
            receiveScoreUpdate(data);
        }

        return;
    }


    if (data.type === "change_match_config") {

        resetRoundVariables();
        matchFinished = false;

        if (typeof openMatchConfig === "function") {
            openMatchConfig();
        }

        return;
    }


    // ======================================
    // TABULEIROS RECEBIDOS
    // ======================================

    if (data.type === "game_boards") {

        receiveGameBoards(
            data.player1,
            data.player2
        );

        return;
    }

    // ======================================
    // PERSONAGEM DO ADVERSÁRIO
    // ======================================

    if (data.type === "opponent_character") {

        opponentCharacter =
            data.image;

        opponentCharacterConfirmed();

        return;
    }

    // ======================================
    // OUTRO JOGADOR CONFIRMOU
    // ======================================

    if (data.type === "character_confirmed") {

        opponentCharacterConfirmed();

        return;
    }

    // ======================================
    // CARTA DO OUTRO JOGADOR
    // ======================================

    if (data.type === "card_toggle") {

        // O servidor deve impedir card_toggle durante
        // uma aposta/troca. O cliente também ignora por segurança.
        if (gameLocked || replacementActive) {
            return;
        }

        updateRemoteCard(
            data.index,
            data.raised
        );

        return;
    }

    // ======================================
    // BLOQUEIO DE APOSTA CONFIRMADO
    // ======================================

    if (data.type === "bet_started") {

        betInProgress = true;

        if (
            Number(data.bettor) ===
            Number(playerNumber)
        ) {
            gameLockReason = "bet";
            return;
        }

        setGameLock(
            true,
            "bet",
            true,
            "O JOGADOR ESTÁ APOSTANDO",
            "Aguarde. Você não pode virar cartas ou interferir durante a aposta."
        );

        if (gameStatus) {
            gameStatus.textContent =
                "O JOGADOR ESTÁ APOSTANDO.";
        }

        return;
    }

    // ======================================
    // BLOQUEIO DE APOSTA NEGADO
    // ======================================

    if (data.type === "bet_lock_denied") {

        betSelectionActive = false;
        betWaitingResult = false;
        betInProgress = false;

        disableBetSelection();

        openCustomPopup(
            "APOSTA INDISPONÍVEL",
            data.message ||
                "Não é possível apostar neste momento.",
            [
                {
                    text: "OK",
                    secondary: false,
                    action: function () {}
                }
            ]
        );

        return;
    }

    // ======================================
    // APOSTA CANCELADA
    // ======================================

    if (data.type === "bet_cancelled") {

        betSelectionActive = false;
        betWaitingResult = false;
        betInProgress = false;

        setGameLock(
            false,
            null,
            false
        );

        if (gameStatus && gameStarted) {
            gameStatus.textContent =
                "ENCONTRE O PERSONAGEM DO ADVERSÁRIO!";
        }

        return;
    }

    // ======================================
    // RESULTADO DA APOSTA
    // ======================================

    if (data.type === "bet_result") {

        betSelectionActive = false;
        betWaitingResult = false;
        betInProgress = false;

        // A aposta acabou, mas uma aposta correta inicia
        // imediatamente a etapa de troca de personagem.
        if (data.correct) {
            handleCorrectBet(data);
        } else {
            setGameLock(false, null, false);
            handleWrongBet(data);
        }

        return;
    }

    // ======================================
    // COMPATIBILIDADE COM EVENTOS ANTIGOS
    // ======================================

    if (data.type === "bet_correct") {

        handleCorrectBet(data);
        return;
    }

    if (data.type === "bet_wrong") {

        setGameLock(false, null, false);
        handleWrongBet(data);
        return;
    }

    // ======================================
    // PERSONAGEM REVELADO
    // ======================================

    if (data.type === "reveal_character") {

        opponentCharacter =
            data.image;

        revealOpponentCharacter();

        return;
    }

    // ======================================
    // INÍCIO DA TROCA DE PERSONAGEM
    // ======================================

    if (data.type === "character_replacement_started") {

        handleCharacterReplacementStarted(
            data
        );

        return;
    }

    // ======================================
    // TROCA DE PERSONAGEM CONCLUÍDA
    // ======================================

    if (data.type === "character_replacement_complete") {

        handleCharacterReplacementComplete(
            data
        );

        return;
    }

    // ======================================
    // RESET DO TABULEIRO ENVIADO PELO SERVIDOR
    // ======================================

    if (data.type === "reset_board") {

        resetLocalBoardOnly();
        return;
    }

    // ======================================
    // CÓDIGO SALVO
    // ======================================

    if (data.type === "game_saved") {

        receiveSavedGameCode(
            data.code
        );

        return;
    }
}


// ==========================================
// RESET LOCAL SEM AVISAR O SERVIDOR
// ==========================================

function resetLocalBoardOnly() {

    gameCards.forEach(
        function (card) {
            card.raised = true;
            card.wrong = false;
        }
    );

    renderGameBoard();
}


// ==========================================
// ATUALIZAR CARTA REMOTAMENTE
// ==========================================

function updateRemoteCard(
    index,
    raised
) {

    const card =
        gameCards[index];


    if (!card) {
        return;
    }


    card.raised =
        raised;


    const element =
        document.querySelector(
            '#gameBoard .game-card[data-index="' +
            index +
            '"]'
        );


    if (!element) {
        return;
    }


    element.classList.toggle(
        "flipped",
        !raised
    );
}


// ==========================================
// GARANTIR QUE O JOGO POSSA USAR
// O showScreen DO SCRIPT.JS
// ==========================================

function showGameScreen() {

    showScreen(
        gameScreen
    );
}

