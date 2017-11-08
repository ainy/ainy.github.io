all:morph.bin grammar.bin

morph.bin:morph.db make_morph.py
	python make_morph.py

morph.db:make_db.py opencorpora
	python make_db.py

grammar.bin:make_grammar.py UD_Russian-SynTagRus
	python make_grammar.py

UD_Russian-SynTagRus:
	git clone https://github.com/UniversalDependencies/UD_Russian-SynTagRus.git

clean:
	rm -f morph.bin grammar.bin