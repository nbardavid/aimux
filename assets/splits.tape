Output assets/splits.gif

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 700
Set Padding 0
Set Theme "Dracula"
Set TypingSpeed 40ms

# Start aimux
Type "bun run start"
Enter
Sleep 2s

# Create a session
Type "n"
Sleep 500ms
Type "aimux"
Sleep 1s
Enter
Sleep 500ms
Enter
Sleep 1.5s

# Launch a Claude tab
Ctrl+N
Sleep 500ms
Enter
Sleep 3s

# Enter input mode and type something
Type "i"
Sleep 300ms
Type "Say hello"
Enter
Sleep 4s

# Enter layout mode with Ctrl+W
Ctrl+W
Sleep 500ms

# Split vertically with |
Type "|"
Sleep 500ms

# Select assistant and confirm
Enter
Sleep 3s

# Enter input mode in the new pane
Type "i"
Sleep 300ms
Type "Say hi"
Enter
Sleep 4s

# Enter layout mode again
Ctrl+W
Sleep 500ms

# Split horizontally with -
Type "-"
Sleep 500ms

# Select assistant and confirm
Enter
Sleep 3s

# Navigate between panes
Ctrl+W
Sleep 300ms
Type "h"
Sleep 500ms
Type "l"
Sleep 500ms
Type "k"
Sleep 500ms
Type "j"
Sleep 500ms

# Resize panes
Type "H"
Sleep 300ms
Type "H"
Sleep 300ms
Type "L"
Sleep 300ms
Type "L"
Sleep 300ms

# Back to navigation
Escape
Sleep 500ms

# Exit
Ctrl+C
Sleep 500ms
