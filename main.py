import os
import csv
import datetime
import customtkinter as ctk
from tkinter import ttk
import logging

# Configuração do sistema de log
logging.basicConfig(filename='log.txt', filemode='a', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Arquivos CSV para cada botão
arquivos_horarios = {
    'DOM_FER': 'VNC_horario_dom_e_fer.csv',
    'SAB': 'VNC_horario_sab.csv',
    'SEG_SEX': 'VNC_horario_seg_sex.csv'
}

class BusScheduleApp:
    def __init__(self, master):
        # Configuração da janela principal
        self.master = master
        master.title('VILA NOVA CACHOEIRINHA')
        master.attributes('-fullscreen', True)
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("dark-blue")

        # Criação do rótulo para exibir os horários
        self.schedule_label = ctk.CTkLabel(
            master, text='', font=ctk.CTkFont(size=50, weight="bold"))
        self.schedule_label.pack(pady=10)

        # Criação do frame da tabela
        self.table_frame = ctk.CTkFrame(master)
        self.table_frame.pack(fill="both", expand=True, padx=20, pady=20)

        style = ttk.Style()
        style.configure("Treeview", font=('Arial', 35), rowheight=80,
                        background="#333333", foreground="#FFFFFF")
        style.configure("Treeview.Heading", font=(
            'Arial', 40, 'bold'), background="#444444")

        # Criação do widget Treeview
        columns = ('PARADA', 'PARTIDA', 'LINHA', 'DESTINO')
        self.treeview = ttk.Treeview(
            self.table_frame, columns=columns, show='headings', height=15)

        for col in columns:
            self.treeview.heading(col, text=col)
            self.treeview.column(col, width=210 if col !=
                                 'DESTINO' else 800, anchor='center' if col != 'DESTINO' else 'w')

        self.treeview.pack(fill="both", expand=True)

        # Criação dos botões dispostos verticalmente
        self.button_frame = ctk.CTkFrame(master)
        self.button_frame.place(x=10, y=10)

        self.buttons = {}
        for label, arquivo in arquivos_horarios.items():
            button = ctk.CTkButton(
                self.button_frame,
                text=label,
                command=lambda l=label, a=arquivo: self.select_schedule(l, a),
                width=10,  # Reduz o tamanho do botão
                height=2,  # Reduz o tamanho do botão
                font=ctk.CTkFont(size=8)  # Ajusta o tamanho da fonte
            )
            button.pack(side="top", pady=2)  # Empilha os botões verticalmente
            self.buttons[label] = button

        # Variáveis de controle
        self.selected_file = list(arquivos_horarios.values())[0]

        # Iniciar atualização
        self.update_schedule()
        self.update_clock()

        # Adiciona o binding para a tecla ESC fechar o programa
        self.master.bind("<Escape>", self.close_program)

    def select_schedule(self, label, arquivo):
        """Ação ao selecionar um arquivo de horários."""
        self.selected_file = arquivo
        self.update_schedule()

        # Registrar log do botão acionado
        logging.info(f"Botão '{label}' acionado. Arquivo carregado: {arquivo}")

    def update_schedule(self):
        """Atualiza a exibição da tabela de horários."""
        try:
            # Ler os horários do arquivo CSV
            with open(self.selected_file, 'r', encoding='utf-8') as csv_file:
                csv_reader = csv.DictReader(csv_file, delimiter=';')
                horarios = [row for row in csv_reader]

            # Hora atual e limite para "operação encerrada"
            hora_atual = datetime.datetime.now().time()
            limite_encerramento = datetime.time(4, 0)

            # Filtrar os horários que ainda vão acontecer
            horarios_filtrados = []
            for h in horarios:
                partida_str = h.get('PARTIDA', '').strip()
                if partida_str:
                    try:
                        partida = datetime.datetime.strptime(
                            partida_str, '%H:%M').time()
                        if partida > hora_atual:
                            horarios_filtrados.append(h)
                    except ValueError:
                        logging.error(f"Erro ao converter horário: {partida_str}")

            # Atualizar a tabela com os horários filtrados ou exibir "OPERAÇÃO ENCERRADA"
            self.treeview.delete(*self.treeview.get_children())
            if not horarios_filtrados or hora_atual < limite_encerramento:
                # Configurar a tag para exibir em vermelho
                self.treeview.tag_configure("encerrada", foreground="red")                
                # Exibir "OPERAÇÃO ENCERRADA" no Treeview
                self.treeview.insert("", "end", values=(
                    "0000", "0000", "0000", "OPERAÇÃO ENCERRADA"), tags=("encerrada",))
            else:
                for h in horarios_filtrados:
                    parada = h.get('PARADA', '-')
                    partida = datetime.datetime.strptime(
                        h.get('PARTIDA', '').strip(), '%H:%M').strftime('%H:%M')
                    linha = h.get('LINHA', '-')
                    destino = h.get('DESTINO', '-')
                    self.treeview.insert("", "end", values=(
                        parada, partida, linha, destino))

        except Exception as e:
            logging.error(f"Erro ao atualizar os horários: {e}")

        # Agendar a próxima atualização em 20 segundos
        self.master.after(1000, self.update_schedule)

    def update_clock(self):
        current_time = datetime.datetime.now().strftime('%d/%m/%Y - %H:%M:%S')
        self.schedule_label.configure(
            text=f"VILA NOVA CACHOEIRINHA | {current_time}")
        self.master.after(1000, self.update_clock)

    def close_program(self, event):
        logging.info("Programa finalizado pelo usuário.")
        self.master.destroy()


root = ctk.CTk()
app = BusScheduleApp(root)
root.mainloop()
