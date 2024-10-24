caminho = ('vnc_horario_sab.csv')
import csv
import datetime
import tkinter as tk
from tkinter import ttk

class BusScheduleApp:
    def __init__(self, master):
        # Configuração da janela principal
        self.master = master
        master.title('VILA NOVA CACHOEIRINHA')
        master.attributes('-fullscreen', True)
        master.configure(bg='#000000')
        
        # Define o estilo da tabela
        style = ttk.Style()
        style.theme_use('default')
        
        style.configure('Treeview.Heading', background='#000000', foreground='#FFFFFF', rowheight=45, fieldbackground='#FFFFFF', font=('Arial', 30, 'bold'))
        style.configure('Treeview', background='#333333', foreground='#FFFFFF', rowheight=70, fieldbackground='#F3F3F3', font=('Arial', 30))
        style.map('Treeview', background=[('selected', '#333333')])

        # Criação do rótulo para exibir os horários
        self.schedule_label = tk.Label(master, text='', font=('Arial', 35, 'bold'), bg='#000000', fg='#F8F8F8')
        self.schedule_label.pack(pady=10)

        # Criação da tabela para exibir os horários
        columns = ('PARADA', 'PARTIDA', 'LINHA', 'DESTINO')
        self.treeview = ttk.Treeview(master, columns=columns, show='headings')
        for col in columns:
            if col == 'PARADA':
                self.treeview.column("PARADA", width=210, minwidth=50, anchor='center')
                self.treeview.heading("PARADA", text="PARADA")
            if col == 'PARTIDA':
                self.treeview.column("PARTIDA", width=210, minwidth=50, anchor='center')
                self.treeview.heading("PARTIDA", text="PARTIDA")
            if col == 'LINHA':
                self.treeview.column("LINHA", width=210, minwidth=50, anchor='center')
                self.treeview.heading("LINHA", text="LINHA")
            if col == 'DESTINO':
                self.treeview.column("DESTINO", width=800, minwidth=50, anchor='w')
                self.treeview.heading("DESTINO", text="DESTINO")

        self.treeview.pack(pady=10)
    
        # Loop de atualização dos horários
        self.update_schedule()

        # Adiciona o binding para a tecla ESC fechar o programa
        self.master.bind("<Escape>", self.close_program)

    def update_schedule(self):
        # Ler os horários do arquivo csv
        with open(caminho, 'r', encoding='utf-8') as csv_file:
            csv_reader = csv.DictReader(csv_file, delimiter=';')
            horarios = [row for row in csv_reader]

        # Filtrar os horários que ainda vão acontecer
        hora_atual = datetime.datetime.now().time()
        horarios_filtrados = []
        for h in horarios:
            partida_str = h.get('PARTIDA', '')
            if partida_str:
                partida = datetime.datetime.strptime(partida_str, '%H:%M').time()
                if partida > hora_atual:
                    horarios_filtrados.append(h)

        # Verificar se há horários disponíveis
        if not horarios_filtrados:
            schedule_text = 'Nenhum horário disponível'
        else:
            # Atualizar o rótulo com os horários filtrados
            schedule_text = 'VILA NOVA CACHOEIRINHA | ' + datetime.datetime.now().strftime('%d/%m/%Y \ %H:%M:%S')
            self.schedule_label.config(text=schedule_text)

            # Limpar a tabela
            self.treeview.delete(*self.treeview.get_children())

            # Exibir os horários filtrados na tabela
            for h in horarios_filtrados:
                parada = h.get('PARADA', '-')
                partida = datetime.datetime.strptime(h.get('PARTIDA', ''), '%H:%M').time()
                linha = h.get('LINHA', '')
                destino = h.get('DESTINO', '')
                if partida > hora_atual:
                    self.treeview.insert("", tk.END, values=(parada, partida, linha, destino), tags=("red",))
                else:
                    self.treeview.insert("", tk.END, values=(parada, partida, linha, destino))

        # Agendar a próxima atualização
        self.master.after(1000, self.update_schedule)  # 1000 milissegundos = 1 segundo

    def close_program(self, event):
        self.master.destroy()
        
# Criação da janela principal e execução do loop de eventos do Tkinter
root = tk.Tk()
app = BusScheduleApp(root)
root.mainloop()