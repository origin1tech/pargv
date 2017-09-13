###-begin-{{app_name}}-completions-###
# Pargv Completion Script
#
# Installation from terminal run:
#   {{app_path}} completions --install
#
# OR (with custom path)
#   {{app_path}} completions --install [your_path]
#
# OR (with redirect)
#   {{app_path}} completions >> ~/.bash_profile (OS X)
#   {{app_path}} completions >> ~/.bashrc
#
_pargv_completions()
{
    local cur args list

    cur="${COMP_WORDS[COMP_CWORD]}"
    args=("${COMP_WORDS[@]}")

    # generate completions from app.
    list=$({{app_path}} {{app_reply_command}} "${args[@]}")

    COMPREPLY=( $(compgen -W "${list}" -- ${cur}) )

    # fall back to filename completion on no match
    if [ ${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=( $(compgen -f -- "${cur}" ) )
    fi

    return 0
}
complete -F _pargv_completions {{app_name}}
###-end-{{app_name}}-completions-###