import os
import sys
import json
from pathlib import Path

def main():
    repo_root = Path(__file__).resolve().parent.parent
    os.chdir(repo_root)
    print(f"Working directory: {repo_root}")

    out_dir = repo_root / "graphify-out"
    out_dir.mkdir(exist_ok=True)

    from graphify.detect import detect
    from graphify.extract import collect_files, extract
    from graphify.build import build_from_json
    from graphify.cluster import cluster, score_all
    from graphify.analyze import god_nodes, surprising_connections, suggest_questions
    from graphify.report import generate
    from graphify.export import to_json, to_html
    from graphify.watch import _read_build_excludes, _read_build_gitignore

    print("[1/5] Detecting codebase files...")
    det = detect(repo_root, extra_excludes=_read_build_excludes(out_dir), gitignore=_read_build_gitignore(out_dir))
    (out_dir / ".graphify_detect.json").write_text(json.dumps(det, ensure_ascii=False), encoding="utf-8")
    print(f"  Total files detected: {det.get('total_files', 0)}")

    print("[2/5] Extracting AST from code files...")
    code_files = []
    for f in det.get("files", {}).get("code", []):
        p = Path(f)
        if p.is_dir():
            code_files.extend(collect_files(p))
        else:
            code_files.append(p)
    print(f"  Collected {len(code_files)} code files for parsing.")

    ast_res = extract(code_files, cache_root=repo_root, root=repo_root)
    (out_dir / ".graphify_ast.json").write_text(json.dumps(ast_res, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  AST extracted: {len(ast_res['nodes'])} nodes, {len(ast_res['edges'])} edges.")

    print("[3/5] Merging extraction payload...")
    merged = {
        "nodes": ast_res["nodes"],
        "edges": ast_res["edges"],
        "hyperedges": [],
        "input_tokens": 0,
        "output_tokens": 0,
    }
    (out_dir / ".graphify_extract.json").write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")

    print("[4/5] Building knowledge graph and computing Louvain communities...")
    G = build_from_json(merged, root=str(repo_root), directed=False)
    print(f"  Graph topology: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    labels = {cid: f"Community {cid}" for cid in communities}
    questions = suggest_questions(G, communities, labels)
    print(f"  Identified {len(communities)} communities and {len(gods)} god nodes.")

    print("[5/5] Exporting graph artifacts...")
    to_json(G, communities, str(out_dir / "graph.json"), force=True)
    to_html(G, communities, str(out_dir / "graph.html"), community_labels=labels)
    report_content = generate(
        G,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        det,
        {"input": 0, "output": 0},
        root=str(repo_root),
        suggested_questions=questions
    )
    (out_dir / "GRAPH_REPORT.md").write_text(report_content, encoding="utf-8")

    print("SUCCESS: Codebase graph generated successfully!")
    print(f"  - JSON Graph: {out_dir / 'graph.json'}")
    print(f"  - Interactive HTML: {out_dir / 'graph.html'}")
    print(f"  - Markdown Report: {out_dir / 'GRAPH_REPORT.md'}")

if __name__ == "__main__":
    main()
