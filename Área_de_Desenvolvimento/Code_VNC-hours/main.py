import os
import logging

# Configuração do sistema de log
logging.basicConfig(filename='log.txt', filemode='a', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def listar_scripts():
    scripts = [f for f in os.listdir() if f.endswith('.py') and f.startswith('VNC_horario_')]
    logging.info(f"Scripts listados: {scripts}")
    return scripts

def executar_script(script):
    logging.info(f"Executando script: {script}")
    os.system(f"python {script}")
    logging.info(f"Script {script} executado com sucesso.")

def main():
    scripts_disponiveis = listar_scripts()

    if not scripts_disponiveis:
        print("Nenhum script disponível para executar.")
        logging.warning("Nenhum script disponível para executar.")
        return

    print("Scripts disponíveis:")
    for i, script in enumerate(scripts_disponiveis, 1):
        print(f"{i}. {script}")

    try:
        escolha = int(input("Escolha o número do script que deseja executar: "))

        if 1 <= escolha <= len(scripts_disponiveis):
            script_escolhido = scripts_disponiveis[escolha - 1]
            executar_script(script_escolhido)
        else:
            print("Escolha inválida.")
            logging.warning("Escolha inválida feita pelo usuário.")
    except ValueError:
        print("Entrada inválida. Por favor, insira um número.")
        logging.error("Entrada inválida - o usuário não digitou um número.")

if __name__ == "__main__":
    main()