// Bridge between ExprTk (3rdPartyLib/exprtk) and the calculator front end.
// Compiled to WebAssembly by wasm/build.sh and loaded from lib/exprtk.ts.

#include <cmath>
#include <cstddef>
#include <string>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "exprtk.hpp"

namespace {

using Scalar      = double;
using SymbolTable = exprtk::symbol_table<Scalar>;
using Expression  = exprtk::expression<Scalar>;
using Parser      = exprtk::parser<Scalar>;

struct EvalResult
{
  bool        ok       = false;
  Scalar      value    = 0.0;
  std::string error;
  int         position = -1; // offset of the offending token, -1 when unknown
};

struct LibraryInfo
{
  std::string name;
  std::string version;
  std::string date;
};

// Reads a { name: number } JS object into parallel arrays. Both are reserved up
// front so the addresses handed to the symbol table stay valid for its lifetime.
void read_variables(const emscripten::val& vars,
                    std::vector<std::string>& names,
                    std::vector<Scalar>& values)
{
  if (vars.isUndefined() || vars.isNull())
    return;

  const emscripten::val keys =
    emscripten::val::global("Object").call<emscripten::val>("keys", vars);

  const unsigned count = keys["length"].as<unsigned>();

  names .reserve(count);
  values.reserve(count);

  for (unsigned i = 0; i < count; ++i)
  {
    const std::string  name = keys[i].as<std::string>();
    const emscripten::val raw = vars[name];

    if (!raw.isNumber())
      continue;

    names .push_back(name);
    values.push_back(raw.as<Scalar>());
  }
}

EvalResult evaluate(const std::string& expression_string, emscripten::val vars)
{
  EvalResult result;

  if (expression_string.find_first_not_of(" \t\r\n") == std::string::npos)
  {
    result.error = "Empty expression";
    return result;
  }

  std::vector<std::string> names;
  std::vector<Scalar>      values;
  read_variables(vars, names, values);

  SymbolTable symbol_table;
  symbol_table.add_constants(); // pi, epsilon, inf
  symbol_table.add_constant("e", std::exp(1.0));

  for (std::size_t i = 0; i < names.size(); ++i)
    symbol_table.add_variable(names[i], values[i]);

  Expression expression;
  expression.register_symbol_table(symbol_table);

  Parser parser;

  try
  {
    if (!parser.compile(expression_string, expression))
    {
      if (parser.error_count() > 0)
      {
        const exprtk::parser_error::type err = parser.get_error(0);
        const std::size_t position = err.token.position;

        result.error    = err.diagnostic;
        result.position = (position <= expression_string.size())
                            ? static_cast<int>(position)
                            : -1;
      }
      else
        result.error = parser.error();

      return result;
    }

    result.value = expression.value();
  }
  catch (const std::exception& e)
  {
    result.error = e.what();
    return result;
  }
  catch (...)
  {
    result.error = "Unknown evaluation failure";
    return result;
  }

  result.ok = true;
  return result;
}

// Names every variable an expression refers to, so the UI can point out the
// ones that have no value bound yet.
emscripten::val collect_variables(const std::string& expression_string)
{
  emscripten::val out = emscripten::val::array();

  std::vector<std::string> symbols;

  if (!exprtk::collect_variables(expression_string, symbols))
    return out;

  for (std::size_t i = 0; i < symbols.size(); ++i)
    out.call<void>("push", symbols[i]);

  return out;
}

LibraryInfo library_info()
{
  LibraryInfo info;
  info.name    = exprtk::information::library;
  info.version = std::string(exprtk::information::version).substr(0, 17);
  info.date    = exprtk::information::date;
  return info;
}

} // namespace

EMSCRIPTEN_BINDINGS(exprtk_bridge)
{
  emscripten::value_object<EvalResult>("EvalResult")
    .field("ok"      , &EvalResult::ok      )
    .field("value"   , &EvalResult::value   )
    .field("error"   , &EvalResult::error   )
    .field("position", &EvalResult::position);

  emscripten::value_object<LibraryInfo>("LibraryInfo")
    .field("name"   , &LibraryInfo::name   )
    .field("version", &LibraryInfo::version)
    .field("date"   , &LibraryInfo::date   );

  emscripten::function("evaluate"        , &evaluate         );
  emscripten::function("collectVariables", &collect_variables);
  emscripten::function("libraryInfo"     , &library_info     );
}
