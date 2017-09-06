###-begin-{{app_name}}-completions-###
#
# pargv completion script
#
# Install Path:
#   {{app_path}} completion >> ~/.bashrc
#
# OSX Install Path:
#   {{app_path}} completion >> ~/.bash_profile
#
_pargv_completions()
{
    local cur args list

    cur="${COMP_WORDS[COMP_CWORD]}"
    args=("${COMP_WORDS[@]}")

    # generate completions from app.
    list=$({{app_path}} {{app_command}} "${args[@]}")

    COMPREPLY=( $(compgen -W "${list}" -- ${cur}) )

    # fall back to filename completion on no match
    if [ ${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=( $(compgen -f -- "${cur}" ) )
    fi

    return 0
}
complete -F _pargv_completions {{app_name}}
###-end-{{app_name}}-completions-###