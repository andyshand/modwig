#include "point.h"

Napi::FunctionReference BESPoint::constructor;

Napi::Object BESPoint::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "BESPoint", {
        InstanceAccessor<&BESPoint::GetX>("x"),
        InstanceAccessor<&BESPoint::GetY>("y")
    });

    BESPoint::constructor = Napi::Persistent(func);  
    BESPoint::constructor.SuppressDestruct();
    exports.Set("BESPoint", func);

    return exports;
}

BESPoint::BESPoint(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BESPoint>(info)
{
    // Napi::Env env = info.Env();
    Napi::Number x = info[0].As<Napi::Number>();
    Napi::Number y = info[1].As<Napi::Number>();
    this->_x = x.DoubleValue();
    this->_y = y.DoubleValue();
}

Napi::Value BESPoint::GetX(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    return Napi::Number::New(env, this->_x);
}

Napi::Value BESPoint::GetY(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    return Napi::Number::New(env, this->_y);
}