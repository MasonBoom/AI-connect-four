from connect_four import *

def game():
    my_board = make_board()
    while not game_is_over(my_board):
        print_board(my_board)
        
        moves = available_moves(my_board)
        print("Available moves:", moves)
        user_move = None

        while user_move not in moves:
            try:
                user_move = int(input("Your turn! Select a column (1-7): "))
                if user_move not in moves:
                    print("Invalid move. Try again.")
            except ValueError:
                print("Invalid input. Please enter a number between 1 and 7.")

        select_space(my_board, user_move, "X")  

        if game_is_over(my_board):
            break  

        result = minimax(my_board, False, 4, -float("Inf"), float("Inf"), evaluate_board)
        print("AI (O) Turn\nAI selected:", result[1])
        select_space(my_board, result[1], "O")

    print_board(my_board)

    if has_won(my_board, "X"):
        print("Congratulations! You (X) won!")
    elif has_won(my_board, "O"):
        print("AI (O) won. Better luck next time!")
    else:
        print("It's a tie!")

def evaluate_board(board):
  if has_won(board, 'X'):
    return float('inf')
  elif has_won(board, 'O'):
    return -float('inf')
  x_two_streak = 0
  o_two_streak = 0
  for col in range(len(board) - 1):
    for row in range(len(board[0])):
      if board[col][row] == 'X' and board[col + 1][row] == 'X':
        x_two_streak += 1
      elif board[col][row] == 'O' and board[col + 1][row] == 'O':
        o_two_streak += 1
  return x_two_streak - o_two_streak
  
game()

new_board = make_board()


