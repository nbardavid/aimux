Output assets/demo.gif

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

# Create a new session
Type "n"
Sleep 500ms

# Search for a project directory
Type "aimux"
Sleep 1s
Enter
Sleep 500ms

# Confirm session name
Enter
Sleep 1.5s

# Launch a Claude tab
Ctrl+N
Sleep 500ms
Enter
Sleep 3s

# Enter input mode and chat
Type "i"
Sleep 300ms
Type "Say hello in one sentence"
Enter
Sleep 4s

# Back to navigation
Ctrl+Z
Sleep 500ms

# Open a second tab
Ctrl+N
Sleep 500ms
Enter
Sleep 3s

# Rename it
Type "r"
Sleep 300ms
Type "refactor"
Enter
Sleep 500ms

# Navigate between tabs
Type "k"
Sleep 500ms
Type "j"
Sleep 500ms

# Split vertically
Type "i"
Sleep 300ms
Ctrl+W
Sleep 300ms
Type "|"
Sleep 500ms
Enter
Sleep 3s

# Navigate between panes
Ctrl+W
Sleep 300ms
Type "h"
Sleep 500ms
Type "l"
Sleep 500ms
Escape
Sleep 500ms

# Toggle sidebar
Ctrl+B
Sleep 500ms
Ctrl+B
Sleep 500ms

# Show help
Type "?"
Sleep 1.5s
Escape
Sleep 500ms

# Exit
Ctrl+C
Sleep 500ms
