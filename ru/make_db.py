#!/usr/bin/env python
#coding: utf-8
from __future__ import unicode_literals
from opencorpora.parse import load_json_or_xml_dict
from opencorpora.download import download_dict
import os
LEMMA_PREFIXES = ["", "по", "наи"]
def _join_lemmas(lemmas, links):
    """
    Combine linked lemmas to single lemma.
    <link_types>
        <type id="1">ADJF-ADJS</type> ясен - ясный
        <type id="2">ADJF-COMP</type> ясный - яснее
        <type id="3">INFN-VERB</type> учить - учил
        <type id="4">INFN-PRTF</type> учить - учивший
        <type id="5">INFN-GRND</type> учить - учив
        <type id="6">PRTF-PRTS</type> учивш - учивший
        <type id="7">NAME-PATR</type> имя - отчество
        <type id="8">PATR_MASC-PATR_FEMN</type> отчество
        <type id="9">SURN_MASC-SURN_FEMN</type> фамилия
        <type id="10">SURN_MASC-SURN_PLUR</type> фамилия
        <type id="11">PERF-IMPF</type> учить-выучить
        <type id="12">ADJF-SUPR_ejsh</type> ясен - яснейший
        <type id="13">PATR_MASC_FORM-PATR_MASC_INFR</type> михалыч-михайлович
        <type id="14">PATR_FEMN_FORM-PATR_FEMN_INFR</type> михална
        <type id="15">ADJF_eish-SUPR_nai_eish</type> яснейший - наияснейший
        <type id="16">ADJF-SUPR_ajsh</type> короткий - кратчайший
        <type id="17">ADJF_aish-SUPR_nai_aish</type> наикратчайший
        <type id="18">ADJF-SUPR_suppl</type> высокий - высший
        <type id="19">ADJF-SUPR_nai</type> наивысший
        <type id="20">ADJF-SUPR_slng</type> ? наихороший
        21 NOUN-ABBR статья - ст.
        22 ? этот - етот
        23 один - первый
        24 NOUN подсудимые
        25 NOUN подсудимые
        26 ADVB-COMP высоко-выше
        27 ABBR 1й - первый
        
    </link_types>
    """

    EXCLUDED_LINK_TYPES = set(['11','26'])
    ALLOWED_LINK_TYPES = set(['1','2','3','4','5','6','7','8','9','10','12','16','18','24','25'])

    moves = dict()

    def move_lemma(from_id, to_id):
        if str(from_id) not in lemmas: return
        if str(to_id) not in lemmas: return
        lm = lemmas[str(from_id)]

        while to_id in moves:
            to_id = moves[to_id]

        lemmas[str(to_id)].extend(lm)
        del lm[:]
        moves[from_id] = to_id

    for link_start, link_end, type_id in links:
        if type_id in EXCLUDED_LINK_TYPES:
            continue

        if type_id not in ALLOWED_LINK_TYPES:
            continue

        move_lemma(link_end, link_start)

    lemma_ids = sorted(lemmas.keys(), key=int)
    return [lemmas[lemma_id] for lemma_id in lemma_ids if lemmas[lemma_id]]

def longest_common_substring(data):
    """
    Return a longest common substring of a list of strings::

        >>> longest_common_substring(["apricot", "rice", "cricket"])
        'ric'
        >>> longest_common_substring(["apricot", "banana"])
        'a'
        >>> longest_common_substring(["foo", "bar", "baz"])
        ''

    See http://stackoverflow.com/questions/2892931/.
    """
    substr = ''
    if len(data) > 1 and len(data[0]) > 0:
        for i in range(len(data[0])):
            for j in range(len(data[0])-i+1):
                if j > len(substr) and all(data[0][i:i+j] in x for x in data):
                    substr = data[0][i:i+j]
    return substr

def _to_paradigm(lemma):
    """
    Extract (stem, paradigm) pair from lemma list.
    Paradigm is a list of suffixes with associated tags and prefixes.
    """
    forms, tags = list(zip(*lemma))
    prefixes = [''] * len(tags)
    stem=forms[0]
    if len(forms)>1:
        stem = longest_common_substring(forms)
        prefixes = [form[:form.index(stem)] for form in forms]
        if any(pref not in LEMMA_PREFIXES for pref in prefixes):
            stem = os.path.commonprefix(forms)
            prefixes = [''] * len(tags)
    suffixes = (
        form[len(pref)+len(stem):]
        for form, pref in zip(forms, prefixes)
    )
    return stem, tuple(zip(suffixes, tags, prefixes))

if not os.path.isfile('dict.opcorpora.xml'):
    download_dict()

print 'opening dict...'
parsed_dict = load_json_or_xml_dict('dict.opcorpora.xml')
print 'lemmas: ', len(parsed_dict.lemmas)

lemmas = _join_lemmas(parsed_dict.lemmas, parsed_dict.links)
#lemmas = parsed_dict.lemmas.values()
seen_tags = dict()
seen_paradigms = dict()
stems = []
tags = 0
paradigms = 0

for lemma in lemmas:
  if len(lemma)>0:
    stem, paradigm = _to_paradigm(lemma)
    for suff, tag, pref in paradigm:
        if tag not in seen_tags:
            seen_tags[tag] = tags
            tags += 1
    if paradigm not in seen_paradigms:
        seen_paradigms[paradigm] = paradigms
        paradigms += 1
    stems.append ((seen_paradigms[paradigm], stem));

print 'paradigms: ', paradigms

import sqlite3

conn = sqlite3.connect('morph.db')
conn.text_factory = str

conn.execute('CREATE TABLE form (rule integer, suffix text, tag text)')
conn.execute('CREATE TABLE stem (rule integer, prefix text)')

for para, rule in seen_paradigms.items():
    print '\r{:.1%}'.format(rule/paradigms),
    for suff, tag, pref in para:
        conn.execute('INSERT INTO form VALUES(?,?,?)', (rule,suff,tag))
for rule,stem in stems:
    conn.execute('INSERT INTO stem VALUES(?,?)', (rule,stem))

print '100%'
conn.execute('CREATE TABLE norm(rule integer, suffix text)')
conn.execute('insert into norm select rule, suffix from form f where rowid = (select rowid from form g where g.rule=f.rule limit 1)')

conn.execute('CREATE TABLE word (form integer, word text);')
#быстый поиск. необходимо 350мб. 
conn.execute('insert into word(form,word) SELECT form.rowid, prefix||suffix FROM stem join form ON form.rule=stem.rule;')
conn.execute('CREATE INDEX word_word ON word(word);')

conn.execute('ALTER TABLE form ADD COLUMN cnt integer;')
conn.execute('CREATE INDEX stem_rule ON stem(rule);')
print '101%'
conn.execute('update form set cnt=(SELECT count() FROM stem WHERE stem.rule=form.rule);')


conn.commit()
conn.close()
