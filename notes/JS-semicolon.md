# Javascript semicolon use

The semicolon is used by the compiler to distinguish between separate statements.
JS have an automatic semicolon feature (ASI, Automatic Semicolon Insertion), automatically add invisible implied semicolons at the end of statements

## Rules for ASI

The JavaScript parser will automatically add a semicolon when, during the parsing of the source code, it finds these particular situations:

- when the next line starts with code that breaks the current one (code can spawn on multiple lines)
- when the next line starts with a }, closing the current block
- when the end of the source code file is reached
- when there is a return statement on its own line
- when there is a break statement on its own line
- when there is a throw statement on its own line
- when there is a continue statement on its own line

## Mandatory semicolons

Semicolons are absolutely needed in for loops or when writing multiple statements on the same line, such as the declaration of a variable. (but the multi line declaration is considered a bad practice)

## Resources

> <https://betterprogramming.pub/the-use-of-the-javascript-semicolon-843fd5e94d0e>
> <https://www.freecodecamp.org/news/lets-talk-about-semicolons-in-javascript-f1fe08ab4e53/>
