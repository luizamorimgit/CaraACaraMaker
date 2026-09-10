from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

def normalize_image_reference(value):
    """Normaliza referências de imagem para comparar a mesma carta.

    O cliente pode enviar a mesma imagem com pequenas diferenças de
    prefixo, como ./, / ou barras invertidas. O servidor continua sendo
    a autoridade do resultado.
    """
    if not isinstance(value, str):
        return ""

    value = value.strip().replace("\\", "/")

    while value.startswith("./"):
        value = value[2:]

    return value.lstrip("/").lower()


rooms = {}


# ==========================================
# OBTER JOGADORES CONECTADOS
# ==========================================

def get_connected_players(room):

    return [
        number
        for number, player in room["players"].items()
        if player is not None
    ]


# ==========================================
# ENVIAR PARA TODOS
# ==========================================

async def broadcast(room, message):

    for player in room["players"].values():

        if player is not None:

            try:

                await player.send_json(message)

            except Exception as error:

                print(
                    "ERRO AO ENVIAR MENSAGEM:",
                    repr(error)
                )


# ==========================================
# REMOVER JOGADOR
# ==========================================

async def remove_player(
    room_code,
    room,
    player_number,
    websocket
):

    # ======================================
    # VERIFICAR SE É A CONEXÃO ATUAL
    # ======================================

    if room["players"].get(player_number) != websocket:
        return


    # ======================================
    # LIBERAR A VAGA
    # ======================================

    room["players"][player_number] = None


    # ======================================
    # LIMPAR APOSTA PENDENTE
    # ======================================

    if room.get("bet") is not None:

        if (
            room["bet"]["player"] == player_number
            or room["bet"]["opponent"] == player_number
        ):

            room["bet"] = None


    # ======================================
    # APAGAR TABULEIRO DO JOGADOR
    # ======================================

    room["boards"].pop(
        player_number,
        None
    )


    # ======================================
    # APAGAR STATUS DE PRONTO
    # ======================================

    room["ready"].discard(
        player_number
    )


    # ======================================
    # APAGAR PERSONAGENS
    # ======================================

    room["characters"] = {}


    room["new_round"] = False


    room["config_controller"] = None

    room["play_again_ready"] = {
        1: False,
        2: False
    }


    # ======================================
    # LIMPAR ESTADO DA RODADA
    # ======================================

    room["bet"] = None


    # ======================================
    # JOGADORES RESTANTES
    # ======================================

    connected_players = get_connected_players(
        room
    )


    # ======================================
    # AVISAR QUEM FICOU
    # ======================================

    for player in room["players"].values():

        if player is not None:

            try:

                await player.send_json({
                    "type": "players",
                    "players": connected_players
                })


                await player.send_json({
                    "type": "player_left",
                    "player": player_number,
                    "players": connected_players
                })

            except Exception as error:

                print(
                    "ERRO AO AVISAR JOGADOR SOBRE SAÍDA:",
                    repr(error)
                )


    # ======================================
    # APAGAR SALA VAZIA
    # ======================================

    if len(connected_players) == 0:

        if rooms.get(room_code) is room:

            rooms.pop(
                room_code,
                None
            )


# ==========================================
# WEBSOCKET
# ==========================================

@app.websocket("/ws/{room_code}/{action}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_code: str,
    action: str
):

    await websocket.accept()

    room_code = room_code.upper()


    # ==========================================
    # CRIAR SALA
    # ==========================================

    if action == "create":

        if room_code in rooms:

            await websocket.send_json({
                "type": "room_exists"
            })

            await websocket.close()

            return


        rooms[room_code] = {

            # ==================================
            # JOGADORES
            # ==================================

            "players": {
                1: None,
                2: None
            },

            # ==================================
            # TABULEIROS
            # ==================================

            "boards": {},

            # ==================================
            # PRONTOS
            # ==================================

            "ready": set(),

            # ==================================
            # PERSONAGENS
            # ==================================

            "characters": {},

            # ==================================
            # APOSTA
            # ==================================

            "bet": None,

            # ==================================
            # NOVA RODADA
            # ==================================

            "new_round": False,

            # ==================================
            # CONFIGURAÇÃO DA PARTIDA
            # ==================================

            "wins_to_finish": 1,

            # ==================================
            # CONTROLADOR DA ALTERAÇÃO DE CONFIGURAÇÃO
            # ==================================

            "config_controller": None,

            # ==================================
            # JOGAR NOVAMENTE
            # ==================================

            "play_again_ready": {
                1: False,
                2: False
            },

            # ==================================
            # PLACAR
            # ==================================

            "score": {
                1: 0,
                2: 0
            }

        }


        room = rooms[room_code]


    # ==========================================
    # ENTRAR EM SALA
    # ==========================================

    elif action == "join":

        if room_code not in rooms:

            await websocket.send_json({
                "type": "room_not_found"
            })

            await websocket.close()

            return


        room = rooms[room_code]


    # ==========================================
    # AÇÃO INVÁLIDA
    # ==========================================

    else:

        await websocket.send_json({
            "type": "invalid_action"
        })

        await websocket.close()

        return


    # ==========================================
    # ENCONTRAR VAGA
    # ==========================================

    player_number = None


    if room["players"][1] is None:

        player_number = 1

    elif room["players"][2] is None:

        player_number = 2

    else:

        await websocket.send_json({
            "type": "room_full"
        })

        await websocket.close()

        return


    # ==========================================
    # REGISTRAR JOGADOR
    # ==========================================

    room["players"][player_number] = websocket


    await websocket.send_json({
        "type": "joined",
        "player": player_number
    })


    # ==========================================
    # ENVIAR CONFIGURAÇÃO ATUAL
    # SOMENTE PARA QUEM ESTÁ ENTRANDO
    # ==========================================

    if action == "join":

        try:

            await websocket.send_json({
                "type": "match_config",
                "wins_to_finish":
                    room["wins_to_finish"],
                "score": {
                    1: room["score"][1],
                    2: room["score"][2]
                }
            })

        except Exception as error:

            print(
                "ERRO AO ENVIAR CONFIGURAÇÃO:",
                repr(error)
            )


    # ==========================================
    # AVISAR QUEM ESTÁ NA SALA
    # ==========================================

    connected_players = get_connected_players(room)


    for player in room["players"].values():

        if player is not None:

            try:

                await player.send_json({
                    "type": "players",
                    "players": connected_players
                })

            except Exception as error:

                print(
                    "ERRO AO ENVIAR LISTA DE JOGADORES:",
                    repr(error)
                )


    # ==========================================
    # RECEBER MENSAGENS
    # ==========================================

    try:

        while True:

            message = await websocket.receive_json()

            message_type = message.get("type")


            # ======================================
            # CONFIGURAR PARTIDA
            # ======================================

            if message_type == "set_match_config":

                wins_to_finish = message.get(
                    "wins_to_finish"
                )


                # ==================================
                # VALIDAR CONFIGURAÇÃO
                # ==================================

                if wins_to_finish not in (
                    1,
                    3,
                    5,
                    7
                ):

                    continue


                # ==================================
                # CONFIGURAÇÃO INICIAL: SOMENTE J1
                # ALTERAÇÃO: SOMENTE O CONTROLADOR
                # ==================================

                config_controller = room.get(
                    "config_controller"
                )

                if config_controller is None:

                    if player_number != 1:
                        continue

                elif player_number != config_controller:

                    continue


                room["wins_to_finish"] = wins_to_finish

                room["config_controller"] = None


                # ==================================
                # PREPARAR NOVA PARTIDA
                # ==================================

                room["characters"] = {}
                room["bet"] = None
                room["new_round"] = False
                room["play_again_ready"] = {
                    1: False,
                    2: False
                }


                # ==================================
                # RESETAR PLACAR
                # ==================================

                room["score"] = {
                    1: 0,
                    2: 0
                }


                print(
                    "PARTIDA CONFIGURADA:",
                    wins_to_finish,
                    "VITÓRIA(S) PARA VENCER."
                )


                # ==================================
                # AVISAR OS DOIS
                # ==================================

                await broadcast(
                    room,
                    {
                        "type": "match_config",
                        "wins_to_finish":
                            wins_to_finish,
                        "score": {
                            1: room["score"][1],
                            2: room["score"][2]
                        }
                    }
                )


                continue


            # ======================================
            # JOGAR NOVAMENTE
            # ======================================

            if message_type == "play_again":

                # ==================================
                # CADA JOGADOR PRECISA CONFIRMAR
                # ==================================

                room.setdefault(
                    "play_again_ready",
                    {1: False, 2: False}
                )

                room["play_again_ready"][player_number] = True

                ready = room["play_again_ready"]

                if not (
                    ready.get(1, False)
                    and ready.get(2, False)
                ):

                    await websocket.send_json({
                        "type": "play_again_waiting"
                    })

                    continue


                # ==================================
                # OS DOIS CONFIRMARAM
                # ==================================

                room["play_again_ready"] = {
                    1: False,
                    2: False
                }

                room["characters"] = {}

                room["bet"] = None

                room["new_round"] = False

                room["config_controller"] = None

                room["score"] = {
                    1: 0,
                    2: 0
                }


                print(
                    "NOVA PARTIDA CONFIRMADA PELOS DOIS JOGADORES."
                )


                await broadcast(
                    room,
                    {
                        "type": "play_again",
                        "score": {
                            1: 0,
                            2: 0
                        },
                        "wins_to_finish":
                            room["wins_to_finish"]
                    }
                )


                continue


            # ======================================
            # MUDAR CONFIGURAÇÃO
            # ======================================

            if message_type == "change_match_config":

                # ==================================
                # SOMENTE UMA SOLICITAÇÃO POR VEZ
                # ==================================

                if room.get("config_controller") is not None:
                    continue


                room["config_controller"] = player_number


                await broadcast(
                    room,
                    {
                        "type":
                            "change_match_config",
                        "wins_to_finish":
                            room["wins_to_finish"],
                        "score": {
                            1: room["score"][1],
                            2: room["score"][2]
                        },
                        "configurator":
                            player_number
                    }
                )


                continue


            # ======================================
            # SAIR DA SALA / PARTIDA
            # ======================================

            if message_type in (
                "leave_room",
                "leave_game"
            ):

                await remove_player(
                    room_code,
                    room,
                    player_number,
                    websocket
                )


                try:

                    await websocket.close(
                        code=1000
                    )

                except Exception as error:

                    print(
                        "ERRO AO FECHAR WEBSOCKET:",
                        repr(error)
                    )


                return


            # ======================================
            # TABULEIRO PRONTO
            # ======================================

            if message_type == "board_ready":

                images = message.get(
                    "images",
                    []
                )


                room["boards"][player_number] = images


                room["ready"].add(
                    player_number
                )


                print(
                    "JOGADOR",
                    player_number,
                    "CONFIRMOU O TABULEIRO."
                )


                # ==================================
                # OS DOIS CONFIRMARAM
                # ==================================

                if (
                    1 in room["ready"]
                    and 2 in room["ready"]
                ):

                    player1 = room["players"][1]

                    player2 = room["players"][2]


                    if (
                        player1 is not None
                        and player2 is not None
                        and 1 in room["boards"]
                        and 2 in room["boards"]
                    ):

                        room["characters"] = {}

                        room["new_round"] = False

                        game_boards_message = {

                            "type": "game_boards",

                            "player1":
                                room["boards"].get(
                                    1,
                                    []
                                ),

                            "player2":
                                room["boards"].get(
                                    2,
                                    []
                                )
                        }


                        print(
                            "OS DOIS JOGADORES ESTÃO PRONTOS. ENVIANDO GAME_BOARDS."
                        )


                        # ==================================
                        # ENVIAR PARA JOGADOR 1
                        # ==================================

                        try:

                            await player1.send_json(
                                game_boards_message
                            )

                        except Exception as error:

                            print(
                                "ERRO AO ENVIAR GAME_BOARDS PARA JOGADOR 1:",
                                repr(error)
                            )


                        # ==================================
                        # ENVIAR PARA JOGADOR 2
                        # ==================================

                        try:

                            await player2.send_json(
                                game_boards_message
                            )

                        except Exception as error:

                            print(
                                "ERRO AO ENVIAR GAME_BOARDS PARA JOGADOR 2:",
                                repr(error)
                            )


                continue


            # ======================================
            # PERSONAGEM ESCOLHIDO
            # ======================================

            if message_type == "character_selected":

                image = message.get(
                    "image"
                )


                if not image:
                    continue


                # ==================================
                # VERIFICAR SE É NOVA RODADA
                # ==================================

                is_new_round = room.get(
                    "new_round",
                    False
                )


                # ==================================
                # SALVAR PERSONAGEM
                # ==================================

                room["characters"][player_number] = image


                print(
                    "JOGADOR",
                    player_number,
                    "ESCOLHEU UM PERSONAGEM."
                )


                # ==================================
                # NOVA RODADA
                # ==================================

                if is_new_round:

                    opponent = (
                        2
                        if player_number == 1
                        else 1
                    )

                    opponent_socket = room["players"].get(
                        opponent
                    )


                    # ==================================
                    # AVISAR QUEM ESCOLHEU
                    # ==================================

                    try:

                        await websocket.send_json({
                            "type": "new_round_start"
                        })

                    except Exception as error:

                        print(
                            "ERRO AO INICIAR NOVA RODADA PARA O VENCEDOR:",
                            repr(error)
                        )


                    # ==================================
                    # AVISAR O ADVERSÁRIO
                    # ==================================

                    if opponent_socket is not None:

                        try:

                            await opponent_socket.send_json({
                                "type": "new_round_start",
                                "opponent_character": image
                            })

                        except Exception as error:

                            print(
                                "ERRO AO INICIAR NOVA RODADA PARA O ADVERSÁRIO:",
                                repr(error)
                            )


                    room["new_round"] = False

                    continue


                # ==================================
                # PRIMEIRA RODADA
                # ==================================

                for player in room["players"].values():

                    if (
                        player is not None
                        and player != websocket
                    ):

                        try:

                            await player.send_json({
                                "type": "opponent_character",
                                "image": image
                            })

                        except Exception as error:

                            print(
                                "ERRO AO ENVIAR PERSONAGEM AO ADVERSÁRIO:",
                                repr(error)
                            )


                continue


            # ======================================
            # APOSTA EM ANDAMENTO
            # ======================================

            if message_type == "bet_in_progress":

                if room["bet"] is not None:
                    continue


                opponent = (
                    2
                    if player_number == 1
                    else 1
                )


                opponent_socket = room["players"].get(
                    opponent
                )


                if opponent_socket is not None:

                    try:

                        await opponent_socket.send_json({
                            "type": "bet_in_progress"
                        })

                    except Exception as error:

                        print(
                            "ERRO AO AVISAR ADVERSÁRIO SOBRE APOSTA:",
                            repr(error)
                        )


                continue


            # ======================================
            # FAZER APOSTA
            # ======================================

            if message_type == "make_bet":

                if room["bet"] is not None:
                    continue


                card_image = message.get(
                    "card_image"
                )

                card_index = message.get(
                    "card_index"
                )


                if not card_image:
                    continue


                if card_index is None:
                    continue


                # ==================================
                # VERIFICAR SE A CARTA EXISTE
                # ==================================

                player1_board = room["boards"].get(
                    1,
                    []
                )

                player2_board = room["boards"].get(
                    2,
                    []
                )


                all_cards = (
                    player1_board
                    + player2_board
                )


                if card_image not in all_cards:
                    continue


                # ==================================
                # VERIFICAR PERSONAGEM
                # ==================================

                if player_number not in room["characters"]:
                    continue


                # ==================================
                # REGISTRAR APOSTA
                # ==================================

                opponent = (
                    2
                    if player_number == 1
                    else 1
                )


                room["bet"] = {
                    "player": player_number,
                    "opponent": opponent,
                    "card_image": card_image,
                    "card_index": card_index
                }


                print(
                    "JOGADOR",
                    player_number,
                    "FEZ UMA APOSTA."
                )


                # ==================================
                # ENVIAR APOSTA AO ADVERSÁRIO
                # ==================================

                opponent_socket = room["players"].get(
                    opponent
                )


                if opponent_socket is not None:

                    try:

                        await opponent_socket.send_json({
                            "type": "make_bet",
                            "card_image": card_image,
                            "card_index": card_index
                        })

                    except Exception as error:

                        print(
                            "ERRO AO ENVIAR APOSTA AO ADVERSÁRIO:",
                            repr(error)
                        )


                continue


            # ======================================
            # CANCELAR APOSTA
            # ======================================

            if message_type == "bet_cancelled":

                if (
                    room["bet"] is not None
                    and room["bet"]["player"] == player_number
                ):

                    room["bet"] = None


                    opponent = (
                        2
                        if player_number == 1
                        else 1
                    )


                    opponent_socket = room["players"].get(
                        opponent
                    )


                    if opponent_socket is not None:

                        try:

                            await opponent_socket.send_json({
                                "type": "bet_cancelled"
                            })

                        except Exception as error:

                            print(
                                "ERRO AO AVISAR CANCELAMENTO DA APOSTA:",
                                repr(error)
                            )


                continue


            # ======================================
            # REVELAR RESULTADO DA APOSTA
            # ======================================

            if message_type == "reveal_bet_result":

                if room["bet"] is None:
                    continue


                bet = room["bet"]


                # ==================================
                # APENAS O DEFENSOR PODE REVELAR
                # ==================================

                if bet["opponent"] != player_number:
                    continue


                # ==================================
                # PERSONAGEM VERDADEIRO
                # ==================================

                selected_character = room["characters"].get(
                    player_number
                )


                if not selected_character:
                    continue


                # ==================================
                # SERVIDOR DECIDE O RESULTADO
                # ==================================

                is_correct = (
                    normalize_image_reference(
                        bet["card_image"]
                    )
                    == normalize_image_reference(
                        selected_character
                    )
                )


                bettor = bet["player"]


                bettor_socket = room["players"].get(
                    bettor
                )


                opponent = bet["opponent"]


                opponent_socket = room["players"].get(
                    opponent
                )


                # ==================================
                # APOSTA CORRETA
                # ==================================

                if is_correct:

                    # ==================================
                    # O APOSTADOR VENCE A RODADA
                    # ==================================

                    round_winner = bettor


                    # ==================================
                    # INCREMENTAR PLACAR
                    # ==================================

                    room["score"][round_winner] += 1


                    current_score = {
                        1: room["score"][1],
                        2: room["score"][2]
                    }


                    print(
                        "JOGADOR",
                        round_winner,
                        "VENCEU A RODADA."
                    )


                    # ==================================
                    # AVISAR RESULTADO DA RODADA
                    # ==================================

                    await broadcast(
                        room,
                        {
                            "type": "round_won",
                            "winner": round_winner,
                            "loser": opponent,
                            "bet_image":
                                bet["card_image"],
                            "score": current_score
                        }
                    )


                    # ==================================
                    # ATUALIZAR PLACAR
                    # ==================================

                    await broadcast(
                        room,
                        {
                            "type": "score_update",
                            "score": current_score
                        }
                    )


                    # ==================================
                    # VERIFICAR VITÓRIA DA PARTIDA
                    # ==================================

                    if (
                        room["score"][round_winner]
                        >= room["wins_to_finish"]
                    ):

                        print(
                            "JOGADOR",
                            round_winner,
                            "VENCEU A PARTIDA."
                        )


                        # ==================================
                        # FINALIZAR PARTIDA
                        # ==================================

                        room["new_round"] = False


                        await broadcast(
                            room,
                            {
                                "type": "match_won",
                                "winner": round_winner,
                                "score": current_score,
                                "wins_to_finish":
                                    room["wins_to_finish"]
                            }
                        )


                    else:

                        # ==================================
                        # AINDA HÁ OUTRAS RODADAS
                        # ==================================

                        room["new_round"] = True


                        # ==================================
                        # AVISAR O VENCEDOR DA RODADA
                        # ==================================

                        if bettor_socket is not None:

                            try:

                                await bettor_socket.send_json({
                                    "type": "bet_won",
                                    "bet_image":
                                        bet["card_image"],
                                    "score": current_score,
                                    "cards": (
                                        room["boards"].get(1, [])
                                        + room["boards"].get(2, [])
                                    )
                                })

                            except Exception as error:

                                print(
                                    "ERRO AO AVISAR VENCEDOR DA APOSTA:",
                                    repr(error)
                                )


                        # ==================================
                        # AVISAR O PERDEDOR DA RODADA
                        # ==================================

                        if opponent_socket is not None:

                            try:

                                await opponent_socket.send_json({
                                    "type": "bet_lost",
                                    "bet_image":
                                        bet["card_image"],
                                    "score": current_score
                                })

                            except Exception as error:

                                print(
                                    "ERRO AO AVISAR PERDEDOR DA APOSTA:",
                                    repr(error)
                                )


                # ==================================
                # APOSTA INCORRETA
                # ==================================

                else:

                    if bettor_socket is not None:

                        try:

                            await bettor_socket.send_json({
                                "type": "bet_result",
                                "correct": False,
                                "bet_index":
                                    bet["card_index"],
                                "bet_image":
                                    bet["card_image"]
                            })

                        except Exception as error:

                            print(
                                "ERRO AO ENVIAR RESULTADO DA APOSTA:",
                                repr(error)
                            )


                    if opponent_socket is not None:

                        try:

                            await opponent_socket.send_json({
                                "type": "bet_resolved",
                                "correct": False,
                                "bet_image":
                                    bet["card_image"]
                            })

                        except Exception as error:

                            print(
                                "ERRO AO ENVIAR RESULTADO AO DEFENSOR:",
                                repr(error)
                            )


                # ==================================
                # LIMPAR APOSTA
                # ==================================

                room["bet"] = None


                print(
                    "RESULTADO DA APOSTA:",
                    "CORRETA"
                    if is_correct
                    else "INCORRETA"
                )


                continue


            # ======================================
            # CHAT
            # ======================================

            if message_type == "chat_message":

                chat_text = message.get("message")

                if not isinstance(chat_text, str):
                    continue

                chat_text = chat_text.strip()

                if not chat_text:
                    continue

                # O servidor informa quem enviou a mensagem.
                # Assim o cliente consegue usar a cor correta
                # mesmo sem depender de "minha mensagem".
                for player_number_target, player in room["players"].items():

                    if player is None:
                        continue

                    try:

                        await player.send_json({
                            "type": "chat_message",
                            "message": chat_text,
                            "sender": player_number
                        })

                    except Exception as error:

                        print(
                            "ERRO AO ENVIAR MENSAGEM DO CHAT:",
                            repr(error)
                        )

                continue


            # ======================================
            # OUTRAS MENSAGENS DO JOGO
            # ======================================

            for player in room["players"].values():

                if (
                    player is not None
                    and player != websocket
                ):

                    try:

                        await player.send_json(
                            message
                        )

                    except Exception as error:

                        print(
                            "ERRO AO ENVIAR MENSAGEM DO JOGO:",
                            repr(error)
                        )


    # ==========================================
    # JOGADOR DESCONECTOU
    # ==========================================

    except WebSocketDisconnect:

        print(
            "JOGADOR",
            player_number,
            "DESCONECTOU."
        )


        await remove_player(
            room_code,
            room,
            player_number,
            websocket
        )


    # ==========================================
    # OUTRO ERRO DE CONEXÃO
    # ==========================================

    except Exception as error:

        print(
            "ERRO NO WEBSOCKET:",
            repr(error)
        )


        await remove_player(
            room_code,
            room,
            player_number,
            websocket
        )