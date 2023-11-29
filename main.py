import os

def listar_scripts():
    scripts = [f for f in os.listdir() if f.endswith('.py') and f.startswith('VNC_horario_')]
    return scripts

def executar_script(script):
    os.system(f"python {script}")

def main():
    scripts_disponiveis = listar_scripts()

    if not scripts_disponiveis:
        print("Nenhum script disponível para executar.")
        return

    print("Scripts disponíveis:")
    for i, script in enumerate(scripts_disponiveis, 1):
        print(f"{i}. {script}")

    escolha = int(input("Escolha o número do script que deseja executar: "))

    if 1 <= escolha <= len(scripts_disponiveis):
        script_escolhido = scripts_disponiveis[escolha - 1]
        executar_script(script_escolhido)
    else:
        print("Escolha inválida.")

if __name__ == "__main__":
    main()