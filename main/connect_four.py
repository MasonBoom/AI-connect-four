from copy import deepcopy
import random
from functools import lru_cache

random.seed(108)

def print_board(board):
    print()
    print(' ', end='')
    for x in range(1, len(board) + 1):
        print(' %s  ' % x, end='')
    print()

    print('+---+' + ('---+' * (len(board) - 1)))

    for y in range(len(board[0])):
        print('|   |' + ('   |' * (len(board) - 1)))

        print('|', end='')
        for x in range(len(board)):
            print(' %s |' % board[x][y], end='')
        print()

        print('|   |' + ('   |' * (len(board) - 1)))

        print('+---+' + ('---+' * (len(board) - 1)))

def select_space(board, column, player):
    if not move_is_valid(board, column):
        return False
    if player not in ["X", "O"]:
        return False
    for y in range(len(board[0])-1, -1, -1):
        if board[column-1][y] == ' ':
            board[column-1][y] = player
            return True
    return False

def board_is_full(board):
    return all(board[x][y] != ' ' for x in range(len(board)) for y in range(len(board[0])))

def move_is_valid(board, move):
    return 1 <= move <= len(board) and board[move-1][0] == ' '

def available_moves(board):
    return [i for i in range(1, len(board) + 1) if move_is_valid(board, i)]

def has_won(board, symbol):
    for y in range(len(board[0])):
        for x in range(len(board) - 3):
            if all(board[x+i][y] == symbol for i in range(4)):
                return True

    for x in range(len(board)):
        for y in range(len(board[0]) - 3):
            if all(board[x][y+i] == symbol for i in range(4)):
                return True

    for x in range(len(board) - 3):
        for y in range(3, len(board[0])):
            if all(board[x+i][y-i] == symbol for i in range(4)):
                return True

    for x in range(len(board) - 3):
        for y in range(len(board[0]) - 3):
            if all(board[x+i][y+i] == symbol for i in range(4)):
                return True

    return False

def game_is_over(board):
    return has_won(board, "X") or has_won(board, "O") or board_is_full(board)

def improved_evaluate_board(board):
    if has_won(board, "X"):
        return float("Inf")
    elif has_won(board, "O"):
        return -float("Inf")

    score = 0
    center_column = len(board) // 2

    for row in range(len(board[0])):
        if board[center_column][row] == "X":
            score += 3
        elif board[center_column][row] == "O":
            score -= 3

    x_streaks = count_streaks(board, "X")
    o_streaks = count_streaks(board, "O")

    return (x_streaks * 2) - (o_streaks * 3)

def count_streaks(board, symbol):
    count = 0
    for col in range(len(board)):
        for row in range(len(board[0])):
            if board[col][row] == symbol:
                if col < len(board) - 3 and all(board[col+i][row] == symbol for i in range(4)):
                    count += 1
                if row < len(board[0]) - 3 and all(board[col][row+i] == symbol for i in range(4)):
                    count += 1
    return count

def get_dynamic_depth(board):
    empty_spaces = sum(1 for x in range(len(board)) for y in range(len(board[0])) if board[x][y] == " ")
    
    if empty_spaces > 30:
        return 3
    elif empty_spaces > 15:
        return 5
    else:
        return 7

def order_moves(board, moves, is_maximizing, eval_function):
    scored_moves = []
    for move in moves:
        temp_board = deepcopy(board)
        select_space(temp_board, move, "X" if is_maximizing else "O")
        score = eval_function(temp_board)
        scored_moves.append((score, move))

    scored_moves.sort(reverse=is_maximizing, key=lambda x: x[0])
    return [move for _, move in scored_moves]

def minimax(input_board, is_maximizing, depth, alpha, beta, eval_function):
    if game_is_over(input_board) or depth == 0:
        return [eval_function(input_board), ""]

    moves = available_moves(input_board)
    ordered_moves = order_moves(input_board, moves, is_maximizing, eval_function)

    best_value = -float("Inf") if is_maximizing else float("Inf")
    best_move = ordered_moves[0]

    for move in ordered_moves:
        new_board = deepcopy(input_board)
        select_space(new_board, move, "X" if is_maximizing else "O")

        if has_won(new_board, "X" if is_maximizing else "O"):
            return [float("Inf") if is_maximizing else -float("Inf"), move]

        hypothetical_value = minimax(new_board, not is_maximizing, depth - 1, alpha, beta, eval_function)[0]

        if is_maximizing:
            if hypothetical_value > best_value:
                best_value, best_move = hypothetical_value, move
            alpha = max(alpha, best_value)
        else:
            if hypothetical_value < best_value:
                best_value, best_move = hypothetical_value, move
            beta = min(beta, best_value)

        if alpha >= beta:
            break

    return [best_value, best_move]

def play_game(ai):
    BOARDWIDTH, BOARDHEIGHT = 7, 6
    board = [[' ' for _ in range(BOARDHEIGHT)] for _ in range(BOARDWIDTH)]

    while not game_is_over(board):
        print_board(board)
        moves = available_moves(board)
        print("Available moves:", moves)

        user_move = None
        while user_move not in moves:
            try:
                user_move = int(input("Your turn! Select a column (1-7): "))
                if user_move not in moves:
                    print("Invalid move. Try again.")
            except ValueError:
                print("Invalid input. Please enter a number between 1 and 7.")

        select_space(board, user_move, "X")

        if game_is_over(board):
            break

        result = minimax(board, False, get_dynamic_depth(board), -float("Inf"), float("Inf"), improved_evaluate_board)
        print("AI (O) Turn\nAI selected:", result[1])
        select_space(board, result[1], "O")

    print_board(board)
    
    if has_won(board, "X"):
        print("Congratulations! You (X) won!")
    elif has_won(board, "O"):
        print("AI (O) won. Better luck next time!")
    else:
        print("It's a tie!")

def make_board():
    return [[' ' for _ in range(6)] for _ in range(7)]
