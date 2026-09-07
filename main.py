from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

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
    # APAGAR TABULEIRO
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
    # APAGAR PERSONAGEM
    # ======================================

    room["characters"] = {}

    room["new_round"] = False

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

        # Só remove a sala se esta ainda for
        # exatamente a sala registrada no servidor.

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
            "players": {
                1: None,
                2: None
            },

            "boards": {},

            "ready": set(),

            "characters": {},

            "bet": None,

            "new_round": False
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
                    # E ENVIAR O NOVO PERSONAGEM
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

                # Não permite iniciar outra aposta
                # enquanto já existe uma em andamento.

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

                # Não permite duas apostas simultâneas.

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
                # NA PARTIDA
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
                # VERIFICAR SE O JOGADOR
                # ESCOLHEU UM PERSONAGEM
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

                # Só pode revelar se existir uma aposta.

                if room["bet"] is None:
                    continue


                bet = room["bet"]


                # Apenas o jogador que recebeu
                # a aposta pode revelar.

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
                    bet["card_image"]
                    == selected_character
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

                    room["new_round"] = True

                    # O apostador venceu.
                    # Ele precisa iniciar a nova rodada.

                    if bettor_socket is not None:

                        try:

                            await bettor_socket.send_json({
                                "type": "bet_won",
                                "bet_image": bet["card_image"],
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


                    # O jogador que teve o personagem
                    # descoberto perdeu a rodada.
                    # O tabuleiro dele permanece intacto.

                    if opponent_socket is not None:

                        try:

                            await opponent_socket.send_json({
                                "type": "bet_lost",
                                "bet_image": bet["card_image"]
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
                                "bet_index": bet["card_index"],
                                "bet_image": bet["card_image"]
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
                                "bet_image": bet["card_image"]
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
